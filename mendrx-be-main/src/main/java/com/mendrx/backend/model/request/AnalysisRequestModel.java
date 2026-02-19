package com.mendrx.backend.model.request;

import com.mendrx.backend.model.shared.ParameterData;

import java.util.List;
import java.util.UUID;

public class AnalysisRequestModel {
    private UUID reportId;
    private List<ParameterData> bloodReportData;

    // Getters and setters
    public UUID getReportId() {
        return reportId;
    }

    public void setReportId(UUID reportId) {
        this.reportId = reportId;
    }

    public List<ParameterData> getBloodReportData() {
        return bloodReportData;
    }

    public void setBloodReportData(List<ParameterData> bloodReportData) {
        this.bloodReportData = bloodReportData;
    }
}
