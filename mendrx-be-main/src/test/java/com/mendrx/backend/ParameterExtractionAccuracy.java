package com.mendrx.backend;

import com.mendrx.backend.model.ParameterComparisonResult;
import com.mendrx.backend.model.ParameterExtractionTestResult;
import com.mendrx.backend.service.ParameterExtractionTestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(classes = BackendApplication.class)
@ActiveProfiles("test")
class ParameterExtractionAccuracy {
    @Autowired
    private ParameterExtractionTestService testService;

    @Test
    void testParameterExtractionAccuracy() {
        String testDataDir = "src/test/resources/test_reports";
        List<ParameterExtractionTestResult> results = testService.runAccuracyTests(testDataDir);

        for (ParameterExtractionTestResult result : results) {
            System.out.println("Report: " + result.getReportId());
            System.out.println("Total Expected Parameters: " + result.getTotalExpectedParameters());
            System.out.println("Correct Extractions: " + result.getCorrectExtractions());
            System.out.println("Incorrect Extractions: " + result.getIncorrectExtractions());
            System.out.println("Missing Parameters: " + result.getMissingExtractions());
            System.out.println("Hallucinated Parameters: " + result.getHallucinations());
            System.out.println("Precision: " + String.format("%.2f%%", result.getPrecision() * 100));
            System.out.println("Recall: " + String.format("%.2f%%", result.getRecall() * 100));
            System.out.println("F1 Score: " + String.format("%.2f%%", result.getF1Score() * 100));

            System.out.println("\nDetailed Results:");
            for (ParameterComparisonResult comparison : result.getDetailedResults()) {
                switch (comparison.getStatus()) {
                    case CORRECT:
                        System.out.printf("✓ %s: %s %s\n",
                                comparison.getParameterName(),
                                comparison.getActualValue(),
                                comparison.getActualUnit());
                        break;
                    case INCORRECT_VALUE:
                        System.out.printf("⚠ %s: Expected %s %s, Got %s %s\n",
                                comparison.getParameterName(),
                                comparison.getExpectedValue(),
                                comparison.getExpectedUnit(),
                                comparison.getActualValue(),
                                comparison.getActualUnit());
                        break;
                    case MISSING:
                        System.out.printf("✕ %s: Missing (Expected %s %s)\n",
                                comparison.getParameterName(),
                                comparison.getExpectedValue(),
                                comparison.getExpectedUnit());
                        break;
                    case HALLUCINATED:
                        System.out.printf("! %s: Hallucinated value %s %s\n",
                                comparison.getParameterName(),
                                comparison.getActualValue(),
                                comparison.getActualUnit());
                        break;
                }
            }
            System.out.println("------------------------");
        }

        // Add assertions for minimum quality requirements
        for (ParameterExtractionTestResult result : results) {
            assertTrue(result.getPrecision() >= 0.90,
                    "Precision for " + result.getReportId() + " below 90%");
            assertTrue(result.getRecall() >= 0.90,
                    "Recall for " + result.getReportId() + " below 90%");
            assertEquals(0, result.getHallucinations(), "Found hallucinated parameters in " + result.getReportId());
        }
    }
}
