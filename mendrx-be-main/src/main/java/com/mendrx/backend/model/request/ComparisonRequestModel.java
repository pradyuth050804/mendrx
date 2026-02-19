package com.mendrx.backend.model.request;

import java.util.List;

public class ComparisonRequestModel {
    private List<String> reportIds;

    public List<String> getReportIds() {
        return reportIds;
    }

    public void setReportIds(List<String> reportIds) {
        this.reportIds = reportIds;
    }
}