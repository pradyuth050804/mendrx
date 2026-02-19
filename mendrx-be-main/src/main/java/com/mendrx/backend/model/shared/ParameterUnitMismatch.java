package com.mendrx.backend.model.shared;

public class ParameterUnitMismatch {
    private String parameterName;
    private String originalValue;
    private String originalUnit;
    private String convertedValue;
    private String convertedUnit;

    public ParameterUnitMismatch() {
    }

    public ParameterUnitMismatch(String parameterName, String originalValue, String originalUnit, 
                                String convertedValue, String convertedUnit) {
        this.parameterName = parameterName;
        this.originalValue = originalValue;
        this.originalUnit = originalUnit;
        this.convertedValue = convertedValue;
        this.convertedUnit = convertedUnit;
    }

    public String getParameterName() {
        return parameterName;
    }

    public void setParameterName(String parameterName) {
        this.parameterName = parameterName;
    }

    public String getOriginalValue() {
        return originalValue;
    }

    public void setOriginalValue(String originalValue) {
        this.originalValue = originalValue;
    }

    public String getOriginalUnit() {
        return originalUnit;
    }

    public void setOriginalUnit(String originalUnit) {
        this.originalUnit = originalUnit;
    }

    public String getConvertedValue() {
        return convertedValue;
    }

    public void setConvertedValue(String convertedValue) {
        this.convertedValue = convertedValue;
    }

    public String getConvertedUnit() {
        return convertedUnit;
    }

    public void setConvertedUnit(String convertedUnit) {
        this.convertedUnit = convertedUnit;
    }
}