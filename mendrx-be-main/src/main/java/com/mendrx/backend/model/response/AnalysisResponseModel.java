package com.mendrx.backend.model.response;

import com.mendrx.backend.model.Report;

public class AnalysisResponseModel {
    private Report report;
    private Integer consumedCredits;
    private Integer updatedCredits;

    public Report getReport() {
        return report;
    }

    public Integer getConsumedCredits() {
        return consumedCredits;
    }

    public Integer getUpdatedCredits() {
        return updatedCredits;
    }

    public void setReport(Report report) {
        this.report = report;
    }

    public void setConsumedCredits(Integer consumedCredits) {
        this.consumedCredits = consumedCredits;
    }

    public void setUpdatedCredits(Integer updatedCredits) {
        this.updatedCredits = updatedCredits;
    }
}
