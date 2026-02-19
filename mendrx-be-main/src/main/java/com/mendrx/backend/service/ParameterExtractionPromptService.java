package com.mendrx.backend.service;

import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.*;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.protobuf.ByteString;
import com.mendrx.backend.exception.AIResponseFailedException;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.retry.RetryCallback;
import org.springframework.retry.RetryContext;
import org.springframework.retry.RetryListener;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.mendrx.backend.model.shared.ExtractionResult;
import com.mendrx.backend.model.shared.ParameterUnitMismatch;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
public class ParameterExtractionPromptService {
    private static final Logger logger = LoggerFactory.getLogger(ParameterExtractionPromptService.class);

    @Autowired
    private MultiParametersFileService multiParametersFileService;

    @Autowired
    private ParameterCorrectionService parameterCorrectionService;

    @Value("${google.cloud.vertex-ai-project-id}")
    private String vertexAiProjectId;

    @Value("${google.cloud.vertex-ai.location}")
    private String location;

    @Value("${google.cloud.vertex-ai.global-endpoint}")
    private String endpoint;

    private String cleanResponse(String response) {
        if (response == null || response.trim().isEmpty()) {
            return "";
        }

        // Remove code block markers from both start and end, and any extra text
        return Arrays.stream(response.replaceAll("^```(?:csv)?\\n?|\\n?```$", "").trim().split("\n"))
                .filter(line -> !line.contains(":")).collect(Collectors.joining("\n"));
    }

    public ExtractionResult getResponse(MultipartFile[] files, Integer parentId) throws AIResponseFailedException {

        try {
            // Step 1: Extract parameters with original units
            String extractedData = extractParametersWithRetry(files, parentId);
            // Step 2: Convert units according to reference list
            String convertedData = convertUnitsWithRetry(extractedData, parentId);

            // Step 3: Compare original and converted data to find unit mismatches
            List<ParameterUnitMismatch> unitMismatches = compareUnits(extractedData, convertedData, parentId);

            // Step 4: Correct parameter values
            String correctedData = parameterCorrectionService.correctParameterValues(convertedData,
                    multiParametersFileService.getParametersData(parentId).getParameterUnits());

            return new ExtractionResult(correctedData, unitMismatches);
        } catch (Exception e) {
            throw new AIResponseFailedException("AI response failed during parameter extraction", e);
        }
    }

    private String extractParameters(MultipartFile[] files, Integer parentId) throws IOException {
        String extractionPrompt = getExtractionPrompt(parentId);
        try (VertexAI vertexAi = new VertexAI.Builder()
                .setProjectId(vertexAiProjectId)
                .setLocation("global")
                .setApiEndpoint(endpoint)
                .build()) {

            GenerationConfig generationConfig = GenerationConfig.newBuilder()
                    .setTemperature(0.2F) // Lower temperature for more factual extraction
                    .setTopP(0.95F)
                    .build();

            GenerativeModel model = new GenerativeModel.Builder()
                    .setModelName("gemini-2.0-flash")
                    .setVertexAi(vertexAi)
                    .setGenerationConfig(generationConfig)
                    .build();

            GenerateContentResponse responseStream = null;

            if (files != null && files.length != 0) {
                // Process PDF files
                List<Part> parts = processPdfFiles(files);

                // Create content from the user with both prompt and data
                Content userContent = Content.newBuilder()
                        .setRole("user")
                        .addParts(Part.newBuilder().setText(extractionPrompt).build())
                        .addAllParts(parts)
                        .build();

                responseStream = model.generateContent(userContent);
            }

            if (responseStream != null) {
                StringBuffer sb = new StringBuffer();
                responseStream.getCandidatesList().forEach(t -> sb.append(t.getContent().getParts(0).getText()));
                return cleanResponse2(sb.toString());
            } else {
                String errorMsg = "No response received from AI model during parameter extraction";
                throw new IOException(errorMsg);
            }
        } catch (Exception e) {
            throw new IOException("Error during parameter extraction: " + e.getMessage(), e);
        }
    }

    private String getExtractionPrompt(Integer parentId) {
        String parametersData = multiParametersFileService.getParametersData(parentId).getFileContent();

        return String.format(
                """
                        REFERENCE PARAMETERS LIST:
                        %s

                        TASK:
                        Extract all blood test parameters, their values, and units exactly as they appear in the provided medical report(s). Match parameters to the reference list when possible.

                        PARAMETER MATCHING RULES:
                        1. Base Matching:
                           - Match parameters regardless of case (e.g., "CREATININE" = "Creatinine")
                           - Ignore spaces and hyphens (e.g., "HDL-C" = "HDL C")
                           - Match common variations and synonyms

                        2. Common Variations:
                           - Match prefix/suffix variations (e.g., "Total Creatinine" = "Creatinine-Serum")
                           - Match abbreviations (e.g., "Hb" = "Hemoglobin")

                        3. Context Matching:
                           - Consider section context (e.g., parameters under "Kidney Function")
                           - Consider location specifiers (e.g., "Blood Urea" = "Urea-Serum")

                        EXTRACTION GUIDELINES:
                        1. Extract exactly as shown in the report:
                           - Parameter name as displayed in the report
                           - Numeric value as displayed in the report
                           - Unit as displayed in the report (if present)

                        2. Maintain original precision:
                           - Keep all decimal places as shown
                           - Do not round or modify values

                        3. Special cases:
                           - For ranges, extract the single measured value (not the range)
                           - For qualitative results (e.g., "Positive"), include as is
                           - For results with "<" or ">", include the symbol with the value

                        JSON OUTPUT FORMAT:
                        Output as a JSON array of objects with the following properties:
                        1. "reportParameterName": Name as it appears in the report
                        2. "referenceParameterName": Matching name from the reference list (if found)
                        3. "value": The numeric or text value as it appears in the report
                        4. "unit": The unit as it appears in the report (if any)

                        Example:
                        [
                          {
                            "reportParameterName": "HAEMOGLOBIN",
                            "referenceParameterName": "Hemoglobin",
                            "value": "14.2",
                            "unit": "g/dL"
                          },
                          {
                            "reportParameterName": "MONOCYTES",
                            "referenceParameterName": "Monocytes",
                            "value": "8",
                            "unit": "%%"
                          }
                        ]

                        IMPORTANT:
                        - Extract ALL parameters from the report which are present in REFERENCE PARAMETERS LIST without missing any
                        - Do NOT include parameters for which there is no referenceParameterName
                        - Do NOT attempt any unit conversions
                        - For parameters not in the reference list, leave "referenceParameterName" empty
                        - Maintain the exact precision and format from the report
                        """,
                parametersData);
    }

    private List<Part> processPdfFiles(MultipartFile[] files) throws IOException {
        List<Part> parts = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty() && "application/pdf".equals(file.getContentType())) {
                try {
                    Part pdfPart = Part.newBuilder()
                            .setInlineData(Blob.newBuilder()
                                    .setMimeType(file.getContentType()) // Use the actual mime type
                                    .setData(ByteString.copyFrom(file.getBytes()))
                                    .build())
                            .build();
                    parts.add(pdfPart);
                } catch (IOException e) {
                    // LoggingUtils.logError(logger, "Failed to read bytes for file: {}. Error: {}",
                    // file.getOriginalFilename(), e.getMessage());
                    // Decide how to handle file reading errors (e.g., skip, throw)
                }
            } else {
                // LoggingUtils.logWarn(logger, "Skipping invalid or non-PDF file: {}", (file !=
                // null ? file.getOriginalFilename() : "null file"));
            }
        }
        return parts;
    }

    private String cleanResponse2(String response) {
        if (response == null || response.trim().isEmpty()) {
            return "";
        }

        // Remove code block markers from both start and end
        String cleaned = response.replaceAll("^```(?:csv|json)?\\n?|\\n?```$", "").trim();

        // Detect if the response is JSON or CSV based on content
        if (cleaned.startsWith("[") || cleaned.startsWith("{")) {
            // This is JSON data - don't filter out lines with colons
            return cleaned;
        } else {
            // This is CSV or other non-JSON format - filter out explanation lines (which
            // often contain colons)
            // But keep the header line which contains colons
            String[] lines = cleaned.split("\n");
            boolean isFirstLine = true;
            StringBuilder result = new StringBuilder();

            for (String line : lines) {
                // Keep the header line (first line) or lines without explanatory text
                // (typically contains a colon without a comma)
                if (isFirstLine || !line.contains(":") || line.contains(",")) {
                    if (!result.isEmpty()) {
                        result.append("\n");
                    }
                    result.append(line);
                }
                isFirstLine = false;
            }

            return result.toString();
        }
    }

    private String convertUnits(String extractedData, Integer parentId) throws IOException {
        String conversionPrompt = getConversionPrompt(extractedData, parentId);

        try (VertexAI vertexAi = new VertexAI.Builder()
                .setProjectId(vertexAiProjectId)
                .setLocation("global")
                .setApiEndpoint(endpoint)
                .build()) {

            GenerationConfig generationConfig = GenerationConfig.newBuilder()
                    .setTemperature(0.1F) // Even lower temperature for precise conversion
                    .setTopP(0.95F)
                    .build();

            GenerativeModel model = new GenerativeModel.Builder()
                    .setModelName("gemini-2.5-flash")
                    .setVertexAi(vertexAi)
                    .setGenerationConfig(generationConfig)
                    .build();

            Content userContent = Content.newBuilder()
                    .setRole("user")
                    .addParts(Part.newBuilder().setText(conversionPrompt).build())
                    .build();

            GenerateContentResponse responseStream = model.generateContent(userContent);

            if (responseStream != null) {
                StringBuffer sb = new StringBuffer();
                responseStream.getCandidatesList().forEach(t -> sb.append(t.getContent().getParts(0).getText()));
                return cleanResponse(sb.toString());
            } else {
                String errorMsg = "No response received from AI model during unit conversion";
                throw new IOException(errorMsg);
            }
        } catch (Exception e) {
            throw new IOException("Error during unit conversion: " + e.getMessage(), e);
        }
    }

    private String getConversionPrompt(String extractedData, Integer parentId) {
        String parametersData = multiParametersFileService.getParametersData(parentId).getFileContent();

        // Create a formatted reference that highlights the units
        String formattedReference = formatReferenceWithUnits(parametersData);

        String prompt = String.format(
                """
                        REFERENCE PARAMETERS LIST WITH REQUIRED UNITS:
                        %s

                        EXTRACTED PARAMETERS:
                        %s

                        TASK:
                        Provide CSV output by converting the extracted parameter values to match the EXACT units specified in the reference list - not according to standard conventions. The units in the reference list are the required output units.

                        CONVERSION RULES:
                        1. CRITICAL RULE: ALWAYS use the exact units from the reference list, even when different from standard medical units
                           - If reference shows Magnesium in mg/dL, keep it in mg/dL (do NOT convert to mmol/L)
                           - If reference shows Phosphorus in mg/dL, keep it in mg/dL (do NOT convert to mmol/L)
                           - Some electrolytes may be in mg/dL while others might be in mmol/L in the reference list

                        2. For Parameters with Matching Units:
                           - Keep the value as is
                           - Use the reference list unit in the output

                        3. For Parameters Requiring Unit Conversion:
                           - Convert the value to match ONLY the unit specified in the reference list

                           WBC DIFFERENTIAL CONVERSIONS:
                           - Neutrophils - Absolute: thou/mm^3 to 10^3/uL = direct 1:1 conversion (same value)
                           - Lymphocytes - Absolute: thou/mm^3 to 10^3/uL = direct 1:1 conversion (same value)
                           - Monocytes - Absolute: thou/mm^3 to 10^3/uL = direct 1:1 conversion (same value)
                           - Eosinophils - Absolute: thou/mm^3 to 10^3/uL = direct 1:1 conversion (same value)
                           - Basophils - Absolute: thou/mm^3 to 10^3/uL = direct 1:1 conversion (same value)
                           - Note: "thou/mm^3", "K/uL", "K/μL", "10^3/uL", and "10E3/uL" are all equivalent units

                           HORMONE & THYROID CONVERSIONS:
                           - T3-Total: ng/mL to ng/dL = multiply by 100
                           - T3-Free: pg/mL to ng/dL = multiply by 0.1
                           - T4-Total: μg/dL is equivalent to μg/100mL (no conversion needed)
                           - T4-Free: ng/dL is equivalent to μg/L÷10
                           - TSH: μIU/mL is equivalent to mIU/L (no conversion needed)
                           - Testosterone: ng/dL to nmol/L = multiply by 0.0347
                           - Estradiol: pg/mL to pmol/L = multiply by 3.671

                           ELECTROLYTE CONVERSIONS:
                           - Potassium: mg/dL to mmol/L = multiply by 0.2558
                           - Sodium: mg/dL to mmol/L = multiply by 0.4348
                           - Chloride: mg/dL to mmol/L = multiply by 0.2822
                           - Calcium: mg/dL to mmol/L = multiply by 0.2495
                           - Magnesium: mmol/L to mg/dL = multiply by 2.43
                           - Phosphorus: mmol/L to mg/dL = multiply by 3.097

                           COMMON BLOOD COUNT CONVERSIONS:
                           - WBC: cells/cu.mm to 10^3/uL = divide by 1000
                           - WBC: thou/mm^3 to 10^3/uL = direct 1:1 conversion (same value)
                           - RBC: x10^6/uL is equivalent to 10^6/uL (no conversion needed)
                           - Platelets: 10E3/mm3 to 10^3/uL = no conversion needed (equivalent units)
                           - Absolute Counts (e.g., Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils): x10^3/uL or 10E3/uL → cells/mm³: Multiply by 1000
                           - Absolute Counts (e.g., Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils): cells/mm³ → x10^3/uL or 10E3/uL: Divide by 1000

                           METABOLIC PANEL CONVERSIONS:
                           - Glucose: mg/dL to mmol/L = multiply by 0.0555
                           - Creatinine: mg/dL to µmol/L = multiply by 88.4
                           - Urea/BUN: mg/dL to mmol/L = multiply by 0.357
                           - Uric acid: mg/dL to µmol/L = multiply by 59.48

                           LIPID PANEL CONVERSIONS:
                           - Cholesterol: mg/dL to mmol/L = multiply by 0.02586
                           - Triglycerides: mg/dL to mmol/L = multiply by 0.01129
                           - HDL/LDL: mg/dL to mmol/L = multiply by 0.02586

                           SPECIFIC CONVERSION EXAMPLES:
                           - If Neutrophils - Absolute is 1.55 thou/mm^3 in the report & reference unit is 10^3/uL, then output value is 1.55 10^3/uL
                           - If Lymphocytes - Absolute is 3.54 thou/mm^3 in the report & reference unit is 10^3/uL, then output value is 3.54 10^3/uL
                           - If T3-Total is 1.11 ng/mL in the report & reference unit is ng/dL, then output value is 111 ng/dL
                           - If Potassium is 4.2 mg/dL in the report & reference unit is mmol/L, then output value is 1.07 mmol/L
                           - If Magnesium is 2.19 mg/dL in the report & reference unit is also mg/dL, output value remains 2.19 mg/dL
                           - If Phosphorus is 4.3 mg/dL in the report & reference unit is also mg/dL, output value remains 4.3 mg/dL

                        4. For Unreliable Cases:
                           - Only mark a conversion as unreliable if unit conversion is absolutely impossible
                           - Do NOT mark as unreliable just because a conversion seems complex

                        CSV OUTPUT FORMAT:
                        1. Header row: ParameterName,Value,Unit

                        2. For parameters with successful conversion:
                           ParameterName,Value,Unit
                           Example: Hemoglobin,14.2,g/dL

                        3. For parameters without units:
                           ParameterName,Value,
                           Example: Neutrophil/Lymphocyte ratio,1.2,

                        4. For unreliable cases:
                           ParameterName,,
                           Example: RBC,,

                        IMPORTANT:
                        - ONLY reference the parameter list for final output unit requirements - NOT general medical conventions
                        - ALWAYS use parameter names exactly as they appear in the reference list
                        - ALWAYS use units exactly as they appear in the reference list
                        - Include ALL parameters from reference list in output
                        - Round converted values to 2 decimal places for readability unless converting between milli/deci/centi units (like ng/mL to ng/dL) where precision matters
                        - NEVER leave value empty for parameters where conversion is possible
                        - The reference list's units have absolute priority over standard medical units
                        - ALWAYS check for mismatched units even when the parameter names match exactly
                        - ONLY provide the CSV output without providing code, explanatory text or additional formatting
                        """,
                formattedReference, extractedData);
        return prompt;
    }

    @Retryable(value = { IOException.class,
            EmptyResponseException.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2), listeners = {
                    "retryListener" })
    public String extractParametersWithRetry(MultipartFile[] files, Integer parentId) throws IOException {
        LoggingUtils.logInfo(logger, "Attempting to extract parameters for parentId: {}", parentId);
        try {
            String result = extractParameters(files, parentId);
            if (result == null || result.trim().isEmpty()) {
                LoggingUtils.logWarn(logger,
                        "Received empty response from AI model during parameter extraction, retrying... (parentId: {})",
                        parentId);
                throw new EmptyResponseException("Empty response received during parameter extraction");
            }
            LoggingUtils.logInfo(logger, "Successfully extracted parameters for parentId: {}, result length: {}",
                    parentId, result.length());
            return result;
        } catch (EmptyResponseException e) {
            // Re-throw to trigger retry
            LoggingUtils.logWarn(logger, "Empty response during parameter extraction, will retry (parentId: {})",
                    parentId);
            throw e;
        } catch (IOException e) {
            // Re-throw to trigger retry
            LoggingUtils.logWarn(logger, "IOException during parameter extraction, will retry (parentId: {}): {}",
                    parentId, e.getMessage());
            throw e;
        } catch (Exception e) {
            // Wrap and re-throw to trigger retry
            LoggingUtils.logWarn(logger,
                    "Unexpected exception during parameter extraction, will retry (parentId: {}): {}", parentId,
                    e.getMessage());
            throw new IOException("Error during parameter extraction: " + e.getMessage(), e);
        }
    }

    @Retryable(value = { IOException.class,
            EmptyResponseException.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2), listeners = {
                    "retryListener" })
    public String convertUnitsWithRetry(String extractedData, Integer parentId) throws IOException {
        LoggingUtils.logInfo(logger, "Attempting to convert units for parentId: {}", parentId);
        try {
            String result = convertUnits(extractedData, parentId);
            if (result == null || result.trim().isEmpty()) {
                LoggingUtils.logWarn(logger,
                        "Received empty response from AI model during unit conversion, retrying... (parentId: {})",
                        parentId);
                throw new EmptyResponseException("Empty response received during unit conversion");
            }
            LoggingUtils.logInfo(logger, "Successfully converted units for parentId: {}, result length: {}", parentId,
                    result.length());
            return result;
        } catch (EmptyResponseException e) {
            // Re-throw to trigger retry
            LoggingUtils.logWarn(logger, "Empty response during unit conversion, will retry (parentId: {})", parentId);
            throw e;
        } catch (IOException e) {
            // Re-throw to trigger retry
            LoggingUtils.logWarn(logger, "IOException during unit conversion, will retry (parentId: {}): {}", parentId,
                    e.getMessage());
            throw e;
        } catch (Exception e) {
            // Wrap and re-throw to trigger retry
            LoggingUtils.logWarn(logger, "Unexpected exception during unit conversion, will retry (parentId: {}): {}",
                    parentId, e.getMessage());
            throw new IOException("Error during unit conversion: " + e.getMessage(), e);
        }
    }

    public static class EmptyResponseException extends IOException {
        private static final long serialVersionUID = 1L;

        public EmptyResponseException(String message) {
            super(message);
        }
    }

    @Recover
    public String recoverFromEmptyExtractionResponse(EmptyResponseException e, MultipartFile[] files, Integer parentId)
            throws AIResponseFailedException {
        LoggingUtils.logError(logger, "All retries exhausted for parameter extraction. ParentId: {}, Error: {}",
                parentId, e.getMessage());
        throw new AIResponseFailedException(
                "Failed to extract parameters after multiple retries for parentId: " + parentId, e);
    }

    @Recover
    public String recoverFromExtractionException(Exception e, MultipartFile[] files, Integer parentId)
            throws AIResponseFailedException {
        LoggingUtils.logError(logger,
                "All retries exhausted for parameter extraction due to exception. ParentId: {}, Error: {}", parentId,
                e.getMessage());
        throw new AIResponseFailedException(
                "Failed to extract parameters after multiple retries due to exception for parentId: " + parentId, e);
    }

    @Recover
    public String recoverFromEmptyConversionResponse(EmptyResponseException e, String extractedData, Integer parentId)
            throws AIResponseFailedException {
        LoggingUtils.logError(logger, "All retries exhausted for unit conversion. ParentId: {}, Error: {}", parentId,
                e.getMessage());
        throw new AIResponseFailedException("Failed to convert units after multiple retries for parentId: " + parentId,
                e);
    }

    @Recover
    public String recoverFromConversionException(Exception e, String extractedData, Integer parentId)
            throws AIResponseFailedException {
        LoggingUtils.logError(logger,
                "All retries exhausted for unit conversion due to exception. ParentId: {}, Error: {}", parentId,
                e.getMessage());
        throw new AIResponseFailedException(
                "Failed to convert units after multiple retries due to exception for parentId: " + parentId, e);
    }

    @Bean
    public RetryListener retryListener() {
        return new RetryListener() {
            @Override
            public <T, E extends Throwable> boolean open(RetryContext context, RetryCallback<T, E> callback) {
                return true;
            }

            @Override
            public <T, E extends Throwable> void close(RetryContext context, RetryCallback<T, E> callback,
                    Throwable throwable) {
                // No action needed on close
            }

            @Override
            public <T, E extends Throwable> void onError(RetryContext context, RetryCallback<T, E> callback,
                    Throwable throwable) {
                LoggingUtils.logInfo(logger, "Retry count: {}, Method: {}", context.getRetryCount(),
                        context.getAttribute("context.name"));
            }
        };
    }

    private String formatReferenceWithUnits(String parametersData) {
        StringBuilder formatted = new StringBuilder();
        String[] lines = parametersData.split("\n");

        for (String line : lines) {
            if (line.trim().isEmpty() || line.startsWith("#")) {
                formatted.append(line).append("\n");
                continue;
            }

            String[] parts = line.split(",", 2);
            if (parts.length >= 2) {
                String paramName = parts[0].trim();
                String unit = parts[1].trim();

                // Highlight the required unit for emphasis
                formatted.append(String.format("%s [REQUIRED UNIT: %s]\n", paramName, unit));
            } else {
                formatted.append(line).append("\n");
            }
        }

        return formatted.toString();
    }

    private List<ParameterUnitMismatch> compareUnits(String extractedJsonData, String convertedCsvData,
            Integer parentId) {
        List<ParameterUnitMismatch> mismatches = new ArrayList<>();
        ObjectMapper mapper = new ObjectMapper();

        try {
            // Parse the JSON extraction data
            JsonNode extractedArray = mapper.readTree(extractedJsonData);

            // Parse the CSV converted data
            Map<String, String[]> convertedMap = parseCsvToMap(convertedCsvData);

            // Get reference units
            Map<String, String> referenceUnits = multiParametersFileService.getParametersData(parentId)
                    .getParameterUnits();

            // Compare each parameter
            if (extractedArray.isArray()) {
                for (JsonNode param : extractedArray) {
                    String referenceParamName = param.get("referenceParameterName").asText("");
                    if (!referenceParamName.isEmpty()) {
                        String originalUnit = param.get("unit").asText("");
                        String originalValue = param.get("value").asText("");
                        String referenceUnit = referenceUnits.get(referenceParamName);

                        // Check if units are different and we have converted data
                        if (referenceUnit != null && !originalUnit.equalsIgnoreCase(referenceUnit) &&
                                convertedMap.containsKey(referenceParamName)) {
                            String[] convertedData = convertedMap.get(referenceParamName);
                            if (convertedData != null && convertedData.length >= 2) {
                                String convertedValue = convertedData[0];
                                String convertedUnit = convertedData[1];

                                mismatches.add(new ParameterUnitMismatch(
                                        referenceParamName,
                                        originalValue,
                                        originalUnit,
                                        convertedValue,
                                        convertedUnit));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            LoggingUtils.logWarn(logger, "Error comparing units: {}", e.getMessage());
        }

        return mismatches;
    }

    private Map<String, String[]> parseCsvToMap(String csvData) {
        Map<String, String[]> result = new HashMap<>();
        String[] lines = csvData.split("\n");

        // Skip header
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (!line.isEmpty()) {
                String[] parts = line.split(",", -1);
                if (parts.length >= 3) {
                    String paramName = parts[0].trim();
                    String value = parts[1].trim();
                    String unit = parts[2].trim();
                    result.put(paramName, new String[] { value, unit });
                }
            }
        }

        return result;
    }

}
