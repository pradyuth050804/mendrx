package com.mendrx.backend.model.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class GenerateLifestyleRecRequestModel {

    @NotNull(message = "Report ID cannot be null")
    private UUID reportId;

    @NotEmpty(message = "Poor panels list cannot be empty")
    private List<String> poorPanels; // e.g., ["Blood Health", "Kidney Health", "Glucose Metabolism"]

    // Getters and Setters
    public UUID getReportId() {
        return reportId;
    }

    public void setReportId(UUID reportId) {
        this.reportId = reportId;
    }

    public List<String> getPoorPanels() {
        return poorPanels;
    }

    public void setPoorPanels(List<String> poorPanels) {
        this.poorPanels = poorPanels;
    }
}
