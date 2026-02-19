package com.mendrx.backend.model;

import com.mendrx.backend.model.shared.ParameterData;

import java.util.List;

public class BloodReportGroundTruth {
    private String reportId;
    private String reportFileName;
    private List<ParameterData> parameters;

    public String getReportId() {
        return reportId;
    }

    public void setReportId(String reportId) {
        this.reportId = reportId;
    }

    public String getReportFileName() {
        return reportFileName;
    }

    public void setReportFileName(String reportFileName) {
        this.reportFileName = reportFileName;
    }

    public List<ParameterData> getParameters() {
        return parameters;
    }

    public void setParameters(List<ParameterData> parameters) {
        this.parameters = parameters;
    }
}
