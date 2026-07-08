package com.mendrx.backend.model.request;

import java.util.List;
import java.util.UUID;

public class NewDietPlanRequestModel {
    private UUID reportId;

    // Diet configuration from stepper
    private String primaryDiet;
    private List<String> supportDiets;
    private List<String> modifiers;
    private List<String> clinicalConditions;

    // Nutrition preferences
    private String dietType;        // Vegetarian / Eggetarian / Non-Vegetarian
    private String cuisine;         // South Indian / North Indian / Mixed Indian / Custom
    private String mealFrequency;   // 3 meals / 4 meals / 5 meals
    private String calorieStrategy; // Auto / Mild Deficit / Aggressive Deficit / Maintenance / Surplus
    private String proteinTarget;   // Low / Moderate / High

    // Getters and Setters
    public UUID getReportId() {
        return reportId;
    }

    public void setReportId(UUID reportId) {
        this.reportId = reportId;
    }

    public String getPrimaryDiet() {
        return primaryDiet;
    }

    public void setPrimaryDiet(String primaryDiet) {
        this.primaryDiet = primaryDiet;
    }

    public List<String> getSupportDiets() {
        return supportDiets;
    }

    public void setSupportDiets(List<String> supportDiets) {
        this.supportDiets = supportDiets;
    }

    public List<String> getModifiers() {
        return modifiers;
    }

    public void setModifiers(List<String> modifiers) {
        this.modifiers = modifiers;
    }

    public List<String> getClinicalConditions() {
        return clinicalConditions;
    }

    public void setClinicalConditions(List<String> clinicalConditions) {
        this.clinicalConditions = clinicalConditions;
    }

    public String getDietType() {
        return dietType;
    }

    public void setDietType(String dietType) {
        this.dietType = dietType;
    }

    public String getCuisine() {
        return cuisine;
    }

    public void setCuisine(String cuisine) {
        this.cuisine = cuisine;
    }

    public String getMealFrequency() {
        return mealFrequency;
    }

    public void setMealFrequency(String mealFrequency) {
        this.mealFrequency = mealFrequency;
    }

    public String getCalorieStrategy() {
        return calorieStrategy;
    }

    public void setCalorieStrategy(String calorieStrategy) {
        this.calorieStrategy = calorieStrategy;
    }

    public String getProteinTarget() {
        return proteinTarget;
    }

    public void setProteinTarget(String proteinTarget) {
        this.proteinTarget = proteinTarget;
    }
}
