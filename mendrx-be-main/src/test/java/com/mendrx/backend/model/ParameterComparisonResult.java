package com.mendrx.backend.model;

public class ParameterComparisonResult {
    private String parameterName;
    private String expectedValue;
    private String actualValue;
    private String expectedUnit;
    private String actualUnit;
    private ComparisonStatus status;

    public enum ComparisonStatus {
        CORRECT,           // Value matches ground truth
        INCORRECT_VALUE,   // Parameter present but value/unit wrong
        MISSING,          // In ground truth but not extracted
        HALLUCINATED      // Extracted but not in ground truth
    }

    public ParameterComparisonResult(String parameterName, String expectedValue, String actualValue, String expectedUnit, String actualUnit, ComparisonStatus status) {
        this.parameterName = parameterName;
        this.expectedValue = expectedValue;
        this.actualValue = actualValue;
        this.expectedUnit = expectedUnit;
        this.actualUnit = actualUnit;
        this.status = status;
    }

    public ComparisonStatus getStatus() {
        return status;
    }

    public String getParameterName() {
        return parameterName;
    }

    public String getExpectedValue() {
        return expectedValue;
    }

    public String getActualValue() {
        return actualValue;
    }

    public String getExpectedUnit() {
        return expectedUnit;
    }

    public String getActualUnit() {
        return actualUnit;
    }
}
