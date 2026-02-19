package com.mendrx.backend.model.response;

import com.mendrx.backend.model.SnDPlan;

public class SnDPlanResponseModel {
        private SnDPlan snDPlan;
        private Integer consumedCredits;
        private Integer updatedCredits;

    public SnDPlan getSnDPlan() {
        return snDPlan;
    }

    public void setSnDPlan(SnDPlan snDPlan) {
        this.snDPlan = snDPlan;
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
