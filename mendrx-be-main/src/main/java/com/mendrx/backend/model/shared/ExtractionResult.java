package com.mendrx.backend.model.shared;

import java.util.List;

public class ExtractionResult {
    private String csvData;
    private List<ParameterUnitMismatch> unitMismatches;

    public ExtractionResult() {
    }

    public ExtractionResult(String csvData, List<ParameterUnitMismatch> unitMismatches) {
        this.csvData = csvData;
        this.unitMismatches = unitMismatches;
    }

    public String getCsvData() {
        return csvData;
    }

    public void setCsvData(String csvData) {
        this.csvData = csvData;
    }

    public List<ParameterUnitMismatch> getUnitMismatches() {
        return unitMismatches;
    }

    public void setUnitMismatches(List<ParameterUnitMismatch> unitMismatches) {
        this.unitMismatches = unitMismatches;
    }
}