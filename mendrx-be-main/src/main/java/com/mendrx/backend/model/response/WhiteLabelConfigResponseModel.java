package com.mendrx.backend.model.response;

import com.mendrx.backend.enums.WhiteLabelType;

public class WhiteLabelConfigResponseModel {
    private Boolean enabled;
    private Boolean useParentWhiteLabels;
    private WhiteLabelType type;
    private String logoUrl;
    private String text;
    private String customDisclaimer;
    private String signoffSignatureFileName;
    private String signoffDesignation;
    private String signoffName;
    private String watermarkUrl;

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getUseParentWhiteLabels() {
        return useParentWhiteLabels;
    }

    public void setUseParentWhiteLabels(Boolean useParentWhiteLabels) {
        this.useParentWhiteLabels = useParentWhiteLabels;
    }

    public WhiteLabelType getType() {
        return type;
    }

    public void setType(WhiteLabelType type) {
        this.type = type;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getCustomDisclaimer() {
        return customDisclaimer;
    }

    public void setCustomDisclaimer(String customDisclaimer) {
        this.customDisclaimer = customDisclaimer;
    }

    public String getSignoffSignatureFileName() {
        return signoffSignatureFileName;
    }

    public void setSignoffSignatureFileName(String signoffSignatureFileName) {
        this.signoffSignatureFileName = signoffSignatureFileName;
    }

    public String getSignoffDesignation() {
        return signoffDesignation;
    }

    public void setSignoffDesignation(String signoffDesignation) {
        this.signoffDesignation = signoffDesignation;
    }

    public String getSignoffName() {
        return signoffName;
    }

    public void setSignoffName(String signoffName) {
        this.signoffName = signoffName;
    }

    public String getWatermarkUrl() {
        return watermarkUrl;
    }

    public void setWatermarkUrl(String watermarkUrl) {
        this.watermarkUrl = watermarkUrl;
    }
}
