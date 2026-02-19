package com.mendrx.backend.model.shared;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.Transient;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ParameterData {
    private String parameterName;
    private String value;
    private String units;
    @Transient
    @JsonInclude
    private ParameterInfo parameterInfo;
    public ParameterData() {
    }

    public ParameterData(String parameterName, String value, String units) {
        this.parameterName = parameterName;
        this.value = value;
        this.units = units;
    }

    // Getters and setters
    public String getParameterName() {
        return parameterName;
    }

    public void setParameterName(String parameterName) {
        this.parameterName = parameterName;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getUnits() {
        return units;
    }

    public void setUnits(String units) {
        this.units = units;
    }

    public ParameterInfo getParameterInfo() {
        return parameterInfo;
    }


    public void setParameterInfo(ParameterInfo parameterInfo) {
        this.parameterInfo = parameterInfo;
    }
}