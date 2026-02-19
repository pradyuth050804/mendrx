package com.mendrx.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "snd_plan")
public class SnDPlan {
    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne
    @JoinColumn(name = "report_id", nullable = false)
    @JsonIgnore
    private Report report;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "supplement", joinColumns = @JoinColumn(name = "snd_plan_id"))
    private List<Supplement> supplements = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String supplementNotes;

    @OneToMany(mappedBy = "snDPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<DietPlan> dietPlans = new ArrayList<>();

    @Column(nullable = false)
    private Integer versionCount = 1; // Start with 1 for the initial version

    @Column(nullable = false)
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

    public UUID getId() {
        return id;
    }

    public Report getReport() {
        return report;
    }

    public void setReport(Report report) {
        this.report = report;
    }

    public List<Supplement> getSupplements() {
        return supplements;
    }

    public void setSupplements(List<Supplement> supplements) {
        this.supplements = supplements;
    }

    public String getSupplementNotes() {
        return supplementNotes;
    }

    public void setSupplementNotes(String supplementNotes) {
        this.supplementNotes = supplementNotes;
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

    public List<DietPlan> getDietPlanVersions() {
        return dietPlans;
    }

    public void setDietPlanVersions(List<DietPlan> dietPlans) {
        this.dietPlans = dietPlans;
    }

    public Integer getVersionCount() {
        return versionCount;
    }

    public void setVersionCount(Integer versionCount) {
        this.versionCount = versionCount;
    }
}