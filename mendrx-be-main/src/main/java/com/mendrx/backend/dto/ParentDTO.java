package com.mendrx.backend.dto;

public class ParentDTO {
    private Boolean useParentWhiteLabels;

    private Boolean rcaEnabled;

    private Boolean supplementsEnabled;

    private Boolean dietPlanEnabled;

    private Boolean dietVersioningEnabled;

    private Boolean supplementsAutoPopulationEnabled;


    private Boolean lifestyleRecEnabled;

    private Boolean protocolEnabled;

    private Boolean comparisonEnabled;

    private String websiteWhiteLabelLogoFileUrl;

    public Boolean getUseParentWhiteLabels() {
        return useParentWhiteLabels;
    }

    public void setUseParentWhiteLabels(Boolean useParentWhiteLabels) {
        this.useParentWhiteLabels = useParentWhiteLabels;
    }

    public Boolean getRcaEnabled() {
        return rcaEnabled;
    }

    public void setRcaEnabled(Boolean rcaEnabled) {
        this.rcaEnabled = rcaEnabled;
    }

    public Boolean getSupplementsEnabled() {
        return supplementsEnabled;
    }

    public void setSupplementsEnabled(Boolean supplementsEnabled) {
        this.supplementsEnabled = supplementsEnabled;
    }

    public Boolean getDietPlanEnabled() {
        return dietPlanEnabled;
    }

    public void setDietPlanEnabled(Boolean dietPlanEnabled) {
        this.dietPlanEnabled = dietPlanEnabled;
    }

    public Boolean getComparisonEnabled() {
        return comparisonEnabled;
    }

    public void setComparisonEnabled(Boolean comparisonEnabled) {
        this.comparisonEnabled = comparisonEnabled;
    }

    public Boolean getLifestyleRecEnabled() {
        return lifestyleRecEnabled;
    }

    public void setLifestyleRecEnabled(Boolean lifestyleRecEnabled) {
        this.lifestyleRecEnabled = lifestyleRecEnabled;
    }

    public Boolean getProtocolEnabled() {
        return protocolEnabled;
    }

    public void setProtocolEnabled(Boolean protocolEnabled) {
        this.protocolEnabled = protocolEnabled;
    }

    public String getWebsiteWhiteLabelLogoFileUrl() {
        return websiteWhiteLabelLogoFileUrl;
    }

    public void setWebsiteWhiteLabelLogoFileUrl(String websiteWhiteLabelLogoFileUrl) {
        this.websiteWhiteLabelLogoFileUrl = websiteWhiteLabelLogoFileUrl;
    }

    public Boolean getDietVersioningEnabled() {
        return dietVersioningEnabled;
    }

    public void setDietVersioningEnabled(Boolean dietVersioningEnabled) {
        this.dietVersioningEnabled = dietVersioningEnabled;
    }

    public Boolean getSupplementsAutoPopulationEnabled() {
        return supplementsAutoPopulationEnabled;
    }

    public void setSupplementsAutoPopulationEnabled(Boolean supplementsAutoPopulationEnabled) {
        this.supplementsAutoPopulationEnabled = supplementsAutoPopulationEnabled;
    }
}
