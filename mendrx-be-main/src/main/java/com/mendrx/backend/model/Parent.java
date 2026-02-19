package com.mendrx.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.mendrx.backend.enums.SubscriptionTypeEnum;
import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "\"parent\"")
public class Parent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true)
    @JsonIgnore
    private String name;

    @Column(name = "use_parent_white_labels")
    private Boolean useParentWhiteLabels = false;

    @Column(name = "rca_enabled")
    private Boolean rcaEnabled = true;

    @Column(name = "supplements_enabled")
    private Boolean supplementsEnabled = true;

    @Column(name = "diet_plan_enabled")
    private Boolean dietPlanEnabled = true;

    @Column(name = "diet_versioning_enabled")
    private Boolean dietVersioningEnabled = true;

    @Column(name = "supplements_auto_population_enabled")
    private Boolean supplementsAutoPopulationEnabled = true;

    @Column(name = "lifestyle_rec_enabled")
    private Boolean lifestyleRecommendationsEnabled = false;

    @Column(name = "protocol_enabled")
    private Boolean protocolEnabled = false;

    @Column(name = "comparison_enabled")
    private Boolean comparisonEnabled = true;

    @Column(name = "white_label_logo_file_name")
    private String whiteLabelLogoFileName;

    @Column(name = "website_white_label_logo_file_name")
    private String websiteWhiteLabelLogoFileName;

    @Column(name = "watermark_file_name")
    private String watermarkFileName;

    @Column(name = "custom_disclaimer", columnDefinition = "TEXT")
    private String customDisclaimer;

    @Column(name = "signoff_name")
    private String signoffName;

    @Column(name = "signoff_designation")
    private String signoffDesignation;

    @Column(name = "signoff_signature_file_name")
    private String signoffSignatureFileName;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_type")
    private SubscriptionTypeEnum subscriptionType;

    @Column(name = "subscription_credits")
    private Integer subscriptionCredits;

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Boolean getUseParentWhiteLabels() {
        return useParentWhiteLabels;
    }

    public Boolean getRcaEnabled() {
        return rcaEnabled;
    }

    public Boolean getComparisonEnabled() {
        return comparisonEnabled;
    }

    public String getWhiteLabelLogoFileName() {
        return whiteLabelLogoFileName;
    }

    public String getWebsiteWhiteLabelLogoFileName() {
        return websiteWhiteLabelLogoFileName;
    }

    public String getWatermarkFileName() {
        return watermarkFileName;
    }

    public String getCustomDisclaimer() {
        return customDisclaimer;
    }

    public String getSignoffName() {
        return signoffName;
    }

    public String getSignoffDesignation() {
        return signoffDesignation;
    }

    public String getSignoffSignatureFileName() {
        return signoffSignatureFileName;
    }

    public Integer getSubscriptionCredits() {
        return subscriptionCredits;
    }

    public SubscriptionTypeEnum getSubscriptionType() {
        return subscriptionType;
    }

    public Boolean getSupplementsEnabled() {
        return supplementsEnabled;
    }

    public Boolean getDietPlanEnabled() {
        return dietPlanEnabled;
    }

    public Boolean getDietVersioningEnabled() {
        return dietVersioningEnabled;
    }

    public Boolean getSupplementsAutoPopulationEnabled() {
        return supplementsAutoPopulationEnabled;
    }

    public Boolean getLifestyleRecommendationsEnabled() {
        return lifestyleRecommendationsEnabled;
    }

    public Boolean getProtocolEnabled() {
        return protocolEnabled;
    }

    public void setWatermarkFileName(String watermarkFileName) {
        this.watermarkFileName = watermarkFileName;
    }
}
