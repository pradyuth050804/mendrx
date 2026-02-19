package com.mendrx.backend.model.response;

import com.mendrx.backend.model.DietPlan;

public class DietPlanResponseModel {
    private DietPlan dietPlan;
    private Integer consumedCredits;
    private Integer updatedCredits;

    public DietPlan getDietPlan() {
        return dietPlan;
    }

    public void setDietPlan(DietPlan dietPlan) {
        this.dietPlan = dietPlan;
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
