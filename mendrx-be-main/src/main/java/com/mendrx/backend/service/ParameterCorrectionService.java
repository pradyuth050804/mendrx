package com.mendrx.backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class ParameterCorrectionService {

    private static final String NO_UNIT = "NO_UNIT";
    private static final Pattern NUMERIC_PATTERN = Pattern.compile("^[<>]?\\s*-?\\d+(\\.\\d+)?$");

    public String correctParameterValues(String csvInput, Map<String, String> parameterUnits) {
        List<String> lines = Arrays.asList(csvInput.split("\n"));
        List<String> correctedLines = new ArrayList<>();

        if (lines.isEmpty()) {
            return "";
        }

        for (String s : lines) {
            String line = s.trim();
            if (line.isEmpty()) {
                continue; // Skip empty lines
            }

            String[] parts = line.split(",", -1);
            String parameterName = parts[0].trim();
            String value = parts.length > 1 ? parts[1].trim() : "";
            String unit = parts.length > 2 ? parts[2].trim() : "";

            String[] corrected = correctParameter(parameterName, value, unit, parameterUnits);
            correctedLines.add(String.join(",", corrected));
        }

        return String.join("\n", correctedLines);
    }

    public static String[] correctParameter(String parameterName, String value, String unit, Map<String, String> parameterUnits) {
        String expectedUnit = parameterUnits.getOrDefault(parameterName, "");
        // Handle parameters with no unit
        if (expectedUnit.equals(NO_UNIT)) {
            if(value.isEmpty()){
                if(isNumericWithInequalitySymbol(unit))return new String[]{parameterName, cleanValue(unit), ""};
                else return new String[]{parameterName, "", ""};
            } else {
                if(isNumericWithInequalitySymbol(value)) return new String[]{parameterName, cleanValue(value), ""};
                else return new String[]{parameterName, "", ""};

            }
        }

        // Handle cases where value is empty or contains the unit
        if (value.isEmpty() || value.equals(expectedUnit)) {
            String correctedValue = unit.isEmpty() || unit.equals(expectedUnit) || !isNumericWithInequalitySymbol(unit) ? "" : cleanValue(unit);
            return new String[]{parameterName, correctedValue, expectedUnit};
        }

        // Handle cases where unit is empty or contains the value
        if (unit.isEmpty() || isNumericWithInequalitySymbol(unit)) {
            String correctedValue = isNumericWithInequalitySymbol(value) ? cleanValue(value) : cleanValue(unit);
            return new String[]{parameterName, correctedValue, expectedUnit};
        }

        // If both value and unit are present and seem correct, return as is with the expected unit
        return new String[]{parameterName, cleanValue(value), expectedUnit};
    }

    private static String cleanValue(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return value.replaceAll("[<>\\s]", "").trim();
    }

    public static boolean isNumericWithInequalitySymbol(String str) {
        if (str == null || str.isEmpty()) {
            return false;
        }
        return NUMERIC_PATTERN.matcher(str.trim()).matches();
    }
}
