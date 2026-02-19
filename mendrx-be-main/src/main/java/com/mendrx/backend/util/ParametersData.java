package com.mendrx.backend.util;

import java.util.Collections;
import java.util.Map;

public class ParametersData {

    private final Map<String, String> parameterUnits;
    private final String fileContent;

    public ParametersData(Map<String, String> parameterUnits, String fileContent) {
        this.parameterUnits = parameterUnits;
        this.fileContent = fileContent;
    }

    public Map<String, String> getParameterUnits() {
        // Return unmodifiable copy if you want immutability
        return Collections.unmodifiableMap(parameterUnits);
    }

    public String getFileContent() {
        return fileContent;
    }
}
