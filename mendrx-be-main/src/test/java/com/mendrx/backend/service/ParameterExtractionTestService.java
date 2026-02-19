package com.mendrx.backend.service;

import com.mendrx.backend.model.BloodReportGroundTruth;
import com.mendrx.backend.model.ParameterComparisonResult;
import com.mendrx.backend.model.ParameterExtractionTestResult;
import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ExtractionResult;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ParameterExtractionTestService {

    private static final Logger logger = LoggerFactory.getLogger(ParameterExtractionTestService.class);


    private final ParameterExtractionPromptService parameterExtractionPromptService;
    private final GroundTruthService groundTruthService;
    private final CsvToJsonService csvToJsonService;

    private static final double VALUE_TOLERANCE = 0.0001;

    @Autowired
    public ParameterExtractionTestService(ParameterExtractionPromptService parameterExtractionPromptService,
                                          GroundTruthService groundTruthService,
                                          CsvToJsonService csvToJsonService) {
        this.parameterExtractionPromptService = parameterExtractionPromptService;
        this.groundTruthService = groundTruthService;
        this.csvToJsonService = csvToJsonService;
    }

    public List<ParameterExtractionTestResult> runAccuracyTests(String testDataDirectory) {
        Map<String, BloodReportGroundTruth> groundTruthData = groundTruthService.loadGroundTruthData();
        List<ParameterExtractionTestResult> results = new ArrayList<>();

        File testDataDir = new File(testDataDirectory);
        for (File reportFile : testDataDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"))) {
            BloodReportGroundTruth groundTruth = groundTruthData.get(reportFile.getName());
            if (groundTruth == null) {
                LoggingUtils.logWarn(logger, "No ground truth data found for report: {}", reportFile.getName());
                continue;
            }

            try {
                MultipartFile[] files = new MultipartFile[]{convertFileToMultipartFile(reportFile)};
                ExtractionResult extractionResult = parameterExtractionPromptService.getResponse(files, 1);
                List<ParameterData> extractedParameters = csvToJsonService
                        .convertCsvToReadFileResponseModel(extractionResult.getCsvData(), "MALE", "", 1, extractionResult.getUnitMismatches()).getData().values()
                        .stream()
                        .flatMap(List::stream)
                        .collect(Collectors.toList());

                results.add(compareResults(groundTruth, extractedParameters));
            } catch (Exception e) {
                LoggingUtils.logError(logger, "Error processing report: {}", reportFile.getName(), e);
            }
        }

        return results;
    }

    private ParameterExtractionTestResult compareResults(BloodReportGroundTruth groundTruth,
                                                         List<ParameterData> extractedParameters) {
        List<ParameterComparisonResult> detailedResults = new ArrayList<>();
        int correct = 0;
        int incorrect = 0;
        int missing = 0;
        int hallucinations = 0;

        // Convert lists to maps for easier lookup
        Map<String, ParameterData> extractedMap = extractedParameters.stream()
                .collect(Collectors.toMap(ParameterData::getParameterName, Function.identity()));

        Map<String, ParameterData> groundTruthMap = groundTruth.getParameters().stream()
                .collect(Collectors.toMap(ParameterData::getParameterName, Function.identity()));

        // Check for correct matches and missing values
        for (ParameterData expectedParam : groundTruth.getParameters()) {
            ParameterData actualParam = extractedMap.get(expectedParam.getParameterName());

            if (actualParam == null) {
                // Missing parameter (false negative)
                detailedResults.add(new ParameterComparisonResult(
                        expectedParam.getParameterName(),
                        expectedParam.getValue(),
                        null,
                        expectedParam.getUnits(),
                        null,
                        ParameterComparisonResult.ComparisonStatus.MISSING
                ));
                missing++;
            } else {
                boolean matches = compareParameters(expectedParam, actualParam);
                detailedResults.add(new ParameterComparisonResult(
                        expectedParam.getParameterName(),
                        expectedParam.getValue(),
                        actualParam.getValue(),
                        expectedParam.getUnits(),
                        actualParam.getUnits(),
                        matches ? ParameterComparisonResult.ComparisonStatus.CORRECT : ParameterComparisonResult.ComparisonStatus.INCORRECT_VALUE
                ));

                if (matches) correct++;
                else incorrect++;
            }
        }

        // Check for hallucinations (false positives)
        for (ParameterData extractedParam : extractedParameters) {
            if (!groundTruthMap.containsKey(extractedParam.getParameterName())) {
                detailedResults.add(new ParameterComparisonResult(
                        extractedParam.getParameterName(),
                        null,
                        extractedParam.getValue(),
                        null,
                        extractedParam.getUnits(),
                        ParameterComparisonResult.ComparisonStatus.HALLUCINATED
                ));
                hallucinations++;
            }
        }

        return new ParameterExtractionTestResult(
                groundTruth.getReportId(),
                groundTruth.getParameters().size(),
                correct,
                incorrect,
                missing,
                hallucinations,
                detailedResults
        );
    }

    private boolean compareParameters(ParameterData expected, ParameterData actual) {
        if (actual == null) return false;

        boolean valueMatches = compareValues(expected.getValue(), actual.getValue());
        boolean unitsMatch = Objects.equals(expected.getUnits(), actual.getUnits());

        return valueMatches && unitsMatch;
    }

    private boolean compareValues(String expected, String actual) {
        try {
            double expectedValue = Double.parseDouble(expected);
            double actualValue = Double.parseDouble(actual);
            return Math.abs(expectedValue - actualValue) <= VALUE_TOLERANCE;
        } catch (NumberFormatException e) {
            return Objects.equals(expected, actual);
        }
    }

    private MultipartFile convertFileToMultipartFile(File file) throws IOException {
        return new MockMultipartFile(
                file.getName(),
                file.getName(),
                "application/pdf",
                Files.readAllBytes(file.toPath())
        );
    }
}
