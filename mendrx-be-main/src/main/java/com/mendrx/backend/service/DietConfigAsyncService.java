package com.mendrx.backend.service;

import com.mendrx.backend.enums.BloodMarkerResultEnum;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DietConfigAsyncService {

    private static final Logger logger = LoggerFactory.getLogger(DietConfigAsyncService.class);

    @Autowired
    private DietConfigPromptService dietConfigPromptService;

    @Autowired
    private ReportService reportService;

    /**
     * Asynchronously generates diet configuration using Gemini and saves it to the report.
     * This runs in a background thread after analysis completes, so the user doesn't wait for it.
     * Failures are logged but do NOT affect the main analysis flow.
     */
    @Async
    public void generateAndSaveDietConfig(Report report) {
        generateAndSaveDietConfigSync(report);
    }

    public String generateAndSaveDietConfigSync(Report report) {
        try {
            LoggingUtils.logInfo(logger, "Diet config generation started for report ID: {}", report.getId());

            String contextString = buildContextString(report);
            String geminiResponse = dietConfigPromptService.generateDietConfig(contextString);

            reportService.saveDietConfig(report.getId(), geminiResponse);

            LoggingUtils.logInfo(logger, "Diet config generation completed for report ID: {}", report.getId());
            return geminiResponse;
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Diet config generation failed for report ID: {}. Error: {}",
                    report.getId(), e.getMessage(), e);
            return null;
        }
    }

    private String buildContextString(Report report) {
        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("CLIENT INFO:\n");
        contextBuilder.append(report.getString()).append("\n\n");

        Double bmi = report.getBmi();
        if (bmi != null) {
            contextBuilder.append("BMI: ").append(String.format("%.1f", bmi));
            if (bmi < 18.5) contextBuilder.append(" (Underweight)");
            else if (bmi < 25) contextBuilder.append(" (Normal)");
            else if (bmi < 30) contextBuilder.append(" (Overweight)");
            else contextBuilder.append(" (Obese)");
            contextBuilder.append("\n\n");
        }

        contextBuilder.append("DEVIATED BLOOD MARKERS:\n");
        List<BloodMarker> markers = report.getBloodMarkers();
        if (markers != null && !markers.isEmpty()) {
            boolean hasDeviated = false;
            for (BloodMarker marker : markers) {
                if (marker.getResult() != BloodMarkerResultEnum.OPTIMAL) {
                    hasDeviated = true;
                    contextBuilder.append(String.format("%s: %s %s [%s, Deviation: %d%%]\n",
                            marker.getParameterName(),
                            marker.getValue(),
                            marker.getUnits(),
                            marker.getResult().toString(),
                            marker.getDeviation()));
                }
            }
            if (!hasDeviated) {
                contextBuilder.append("All markers are optimal\n");
            }
        } else {
            contextBuilder.append("No blood markers available\n");
        }

        return contextBuilder.toString();
    }
}
