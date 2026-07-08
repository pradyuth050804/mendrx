package com.mendrx.backend.service;

import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Deterministic sanity-check layer that runs after the AI extraction and unit conversion pipeline.
 * Catches values that are orders of magnitude off from their expected optimal ranges
 * (for example, T3 = 11710.0 instead of 117.1) and auto-corrects them by trying common
 * conversion factor reversals (/10, /100, /1000, x10, x100, x1000).
 */
@Service
public class ValueSanityCheckService {

    private static final Logger logger = LoggerFactory.getLogger(ValueSanityCheckService.class);

    private static final double[] CORRECTION_FACTORS = {
            0.01,   // /100  (for example, wrongly applied ng/mL -> ng/dL conversion)
            0.001,  // /1000 (for example, cells/mm3 vs 10^3/uL)
            0.1,    // /10
            100.0,  // x100
            1000.0, // x1000
            10.0    // x10
    };

    private static final double IMPLAUSIBLE_HIGH_MULTIPLIER = 10.0;
    private static final double IMPLAUSIBLE_LOW_MULTIPLIER = 0.01;
    private static final double ACCEPTABLE_LOW_MULTIPLIER = 0.1;
    private static final double ACCEPTABLE_HIGH_MULTIPLIER = 10.0;

    public int sanitizeParameterData(Map<String, List<ParameterData>> parameterDataMap,
                                     List<String> largelyDeviatedParams) {
        if (parameterDataMap == null || parameterDataMap.isEmpty()) {
            return 0;
        }

        int correctionCount = 0;

        for (Map.Entry<String, List<ParameterData>> entry : parameterDataMap.entrySet()) {
            String panelName = entry.getKey();
            List<ParameterData> parameters = entry.getValue();

            if (parameters == null) {
                continue;
            }

            for (ParameterData param : parameters) {
                if (correctIfImplausible(param, panelName, largelyDeviatedParams)) {
                    correctionCount++;
                }
            }
        }

        if (correctionCount > 0) {
            LoggingUtils.logInfo(logger, "[SANITY_CHECK] Total corrections applied: {}", correctionCount);
        }

        return correctionCount;
    }

    /**
     * Sanitizes a flat list before RCA analysis persists markers. This protects
     * the final save path even if the browser posts stale or manually edited values.
     */
    public int sanitizeParameterData(List<ParameterData> parameters,
                                     Map<String, ParameterInfo> optimalValues,
                                     List<String> largelyDeviatedParams) {
        if (parameters == null || parameters.isEmpty() || optimalValues == null || optimalValues.isEmpty()) {
            return 0;
        }

        int correctionCount = 0;

        for (ParameterData param : parameters) {
            if (param == null || param.getParameterName() == null) {
                continue;
            }

            ParameterInfo range = optimalValues.get(param.getParameterName());
            if (range == null) {
                continue;
            }

            param.setParameterInfo(range);
            String panelName = range.getPanelName() != null ? range.getPanelName() : "Unknown";
            if (correctIfImplausible(param, panelName, largelyDeviatedParams)) {
                correctionCount++;
            }
        }

        if (correctionCount > 0) {
            LoggingUtils.logInfo(logger, "[SANITY_CHECK] Total corrections applied before analysis: {}", correctionCount);
        }

        return correctionCount;
    }

    private boolean correctIfImplausible(ParameterData param, String panelName,
                                         List<String> largelyDeviatedParams) {
        if (param == null || param.getValue() == null || param.getValue().trim().isEmpty()) {
            return false;
        }
        if (param.getParameterInfo() == null) {
            return false;
        }

        double value;
        try {
            value = Double.parseDouble(param.getValue().trim());
        } catch (NumberFormatException e) {
            return false;
        }

        if (value <= 0) {
            return false;
        }

        ParameterInfo range = param.getParameterInfo();
        double minValue = range.getMinValue();
        double maxValue = range.getMaxValue();

        if (maxValue <= 0 && minValue <= 0) {
            return false;
        }

        boolean tooHigh = maxValue > 0 && value > IMPLAUSIBLE_HIGH_MULTIPLIER * maxValue;
        boolean tooLow = minValue > 0 && value < IMPLAUSIBLE_LOW_MULTIPLIER * minValue;

        if (!tooHigh && !tooLow) {
            return false;
        }

        Double bestCorrectedValue = null;
        double bestDistance = Double.MAX_VALUE;

        for (double factor : CORRECTION_FACTORS) {
            double candidate = value * factor;

            boolean acceptableLow = minValue <= 0 || candidate >= ACCEPTABLE_LOW_MULTIPLIER * minValue;
            boolean acceptableHigh = maxValue <= 0 || candidate <= ACCEPTABLE_HIGH_MULTIPLIER * maxValue;

            if (acceptableLow && acceptableHigh) {
                double rangeMid = (minValue + maxValue) / 2.0;
                double distance = Math.abs(candidate - rangeMid);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCorrectedValue = candidate;
                }
            }
        }

        if (bestCorrectedValue == null) {
            LoggingUtils.logWarn(logger,
                    "[SANITY_CHECK] Implausible value for '{}' (panel: {}): {} (range: {}-{}), no valid correction found",
                    param.getParameterName(), panelName, param.getValue(), minValue, maxValue);
            return false;
        }

        String correctedStr = formatValue(bestCorrectedValue);

        LoggingUtils.logWarn(logger,
                "[SANITY_CHECK] Auto-corrected '{}' (panel: {}): {} -> {} (range: {}-{})",
                param.getParameterName(), panelName, param.getValue(), correctedStr, minValue, maxValue);

        param.setValue(correctedStr);

        if (largelyDeviatedParams != null && !largelyDeviatedParams.contains(param.getParameterName())) {
            largelyDeviatedParams.add(param.getParameterName());
        }

        return true;
    }

    private String formatValue(double value) {
        if (value == Math.floor(value) && !Double.isInfinite(value)) {
            return String.valueOf((long) value);
        }

        return String.format(java.util.Locale.ROOT, "%.2f", value)
                .replaceAll("0+$", "")
                .replaceAll("\\.$", "");
    }
}
