package com.mendrx.backend.model.response;

import com.mendrx.backend.model.LifestyleRecommendations;

public class LifestyleRecResponseModel {

    private LifestyleRecommendations lifestyleRecommendations;
    private Integer consumedCredits; // Only populated for generation response
    private Integer updatedCredits;  // Only populated for generation response

    // Default constructor
    public LifestyleRecResponseModel() {}

    // Getters and Setters
    public LifestyleRecommendations getLifestyleRecommendations() {
        return lifestyleRecommendations;
    }

    public void setLifestyleRecommendations(LifestyleRecommendations lifestyleRecommendations) {
        this.lifestyleRecommendations = lifestyleRecommendations;
    }

    public Integer getConsumedCredits() {
        return consumedCredits;
    }

    public void setConsumedCredits(Integer consumedCredits) {
        this.consumedCredits = consumedCredits;
    }

    public Integer getUpdatedCredits() {
        return updatedCredits;
    }

    public void setUpdatedCredits(Integer updatedCredits) {
        this.updatedCredits = updatedCredits;
    }
}
