package com.mendrx.backend.model.response;

import java.time.LocalDateTime;
import java.util.UUID;

public class ReportMetadataResponseModel {
    private UUID id;
    private UUID clientId;
    private String clientName;
    private Integer ageOnReportDate;
    private String gender;
    private LocalDateTime reportDate;
    private LocalDateTime updatedAt;

    public ReportMetadataResponseModel(UUID id, UUID clientId, String clientName, String gender, LocalDateTime reportDate, LocalDateTime updatedAt, Integer ageOnReportDate) {
        this.id = id;
        this.clientId = clientId;
        this.clientName = clientName;
        this.gender = gender;
        this.reportDate = reportDate;
        this.updatedAt = updatedAt;
        this.ageOnReportDate = ageOnReportDate;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getClientId() {
        return clientId;
    }

    public void setClientId(UUID clientId) {
        this.clientId = clientId;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDateTime getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDateTime reportDate) {
        this.reportDate = reportDate;
    }

    public Integer getAgeOnReportDate() {
        return ageOnReportDate;
    }

    public void setAgeOnReportDate(Integer ageOnReportDate) {
        this.ageOnReportDate = ageOnReportDate;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
