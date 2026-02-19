package com.mendrx.backend.model.request;

public class UpdateNotesRequestModel {
    private String reportId;
    private String notes;

    public String getReportId() {
        return reportId;
    }

    public void setReportId(String reportId) {
        this.reportId = reportId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
