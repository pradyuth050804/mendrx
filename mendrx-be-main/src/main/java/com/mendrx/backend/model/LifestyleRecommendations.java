package com.mendrx.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;
// Import statements for List, ArrayList, JsonManagedReference, OrderBy are removed

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents the overall lifestyle recommendations generated for a specific report.
 * Recommendation details are stored as a JSON string in recommendationData.
 */
@Entity
@Table(name = "lifestyle_recommendations")
public class LifestyleRecommendations {

    @Id
    @GeneratedValue(generator = "UUID")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "report_id", nullable = false)
    private UUID reportId;

    // Removed: @OneToMany relationship with panels

    @Column(columnDefinition = "TEXT") // Use TEXT for broad compatibility, or JSON/JSONB if DB supports
    private String recommendationData; // Stores panels, items, and attributes as a JSON string

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // --- Getters and Setters ---

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getReportId() {
        return reportId;
    }

    public void setReportId(UUID reportId) {
        this.reportId = reportId;
    }

    // Getter and Setter for the new JSON data field
    public String getRecommendationData() {
        return recommendationData;
    }

    public void setRecommendationData(String recommendationData) {
        this.recommendationData = recommendationData;
    }


    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}