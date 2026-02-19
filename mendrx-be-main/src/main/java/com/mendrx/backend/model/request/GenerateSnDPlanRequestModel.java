package com.mendrx.backend.model.request;

import java.util.List;
import java.util.UUID;

public class GenerateSnDPlanRequestModel {
    private UUID reportId;
    private Boolean singleDayPlan;

    // Previous field (optional free-text)

    // New customization options
    private Boolean includeCalorieBreakdown; // checkbox
    private Boolean includeFoodMeasurements; // checkbox
    private Integer maxCaloriesPerDay;       // number input

    // New text inputs
    private String foodInclusions;
    private String foodExclusions;
    private String preferredCuisines;

    // Meal selection
    private List<String> selectedMealTypes;

    // Getters & Setters
    public UUID getReportId() {
        return reportId;
    }

    public void setReportId(UUID reportId) {
        this.reportId = reportId;
    }

    public Boolean getSingleDayPlan() {
        return singleDayPlan;
    }

    public void setSingleDayPlan(Boolean singleDayPlan) {
        this.singleDayPlan = singleDayPlan;
    }

    public Boolean getIncludeCalorieBreakdown() {
        return includeCalorieBreakdown;
    }

    public void setIncludeCalorieBreakdown(Boolean includeCalorieBreakdown) {
        this.includeCalorieBreakdown = includeCalorieBreakdown;
    }

    public Boolean getIncludeFoodMeasurements() {
        return includeFoodMeasurements;
    }

    public void setIncludeFoodMeasurements(Boolean includeFoodMeasurements) {
        this.includeFoodMeasurements = includeFoodMeasurements;
    }

    public Integer getMaxCaloriesPerDay() {
        return maxCaloriesPerDay;
    }

    public void setMaxCaloriesPerDay(Integer maxCaloriesPerDay) {
        this.maxCaloriesPerDay = maxCaloriesPerDay;
    }

    public String getFoodInclusions() {
        return foodInclusions;
    }

    public void setFoodInclusions(String foodInclusions) {
        this.foodInclusions = foodInclusions;
    }

    public String getFoodExclusions() {
        return foodExclusions;
    }

    public void setFoodExclusions(String foodExclusions) {
        this.foodExclusions = foodExclusions;
    }

    public String getPreferredCuisines() {
        return preferredCuisines;
    }

    public void setPreferredCuisines(String preferredCuisines) {
        this.preferredCuisines = preferredCuisines;
    }

    public List<String> getSelectedMealTypes() {
        return selectedMealTypes;
    }

    public void setSelectedMealTypes(List<String> selectedMealTypes) {
        this.selectedMealTypes = selectedMealTypes;
    }
}
