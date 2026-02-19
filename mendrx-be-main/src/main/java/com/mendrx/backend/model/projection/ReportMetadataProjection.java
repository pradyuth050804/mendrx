package com.mendrx.backend.model.projection;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ReportMetadataProjection {
    UUID getId();
    UUID getClientId();
    String getClientName();
    String getGender();
    LocalDateTime getReportDate();
    LocalDateTime getUpdatedAt();
    String getBirthMonth();
}
