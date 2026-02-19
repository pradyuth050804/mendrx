package com.mendrx.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.UUID;

@Embeddable
public class Supplement {
    @Column(nullable = false)
    private UUID id;
    private String name;

    @Column(columnDefinition = "TEXT")
    private String purpose;
    private String timing;
    private String dosage;

    @Column(columnDefinition = "TEXT")
    private String precautions;
    private String timingCategory;

    @Column(columnDefinition = "TEXT")
    private String brandSuggestionsAndGuidelines;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getTiming() {
        return timing;
    }

    public String getTimingCategory() {
        return timingCategory;
    }

    public String getBrandSuggestionsAndGuidelines() {
        return brandSuggestionsAndGuidelines;
    }

    public void setTiming(String timing) {
        this.timing = timing;
    }

    public String getDosage() {
        return dosage;
    }

    public void setDosage(String dosage) {
        this.dosage = dosage;
    }

    public String getPrecautions() {
        return precautions;
    }

    public void setPrecautions(String precautions) {
        this.precautions = precautions;
    }

    public void setTimingCategory(String timingCategory) {
        this.timingCategory = timingCategory;
    }

    public void setBrandSuggestionsAndGuidelines(String brandSuggestionsAndGuidelines) {
        this.brandSuggestionsAndGuidelines = brandSuggestionsAndGuidelines;
    }
}
