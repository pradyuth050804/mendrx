package com.mendrx.backend.enums;

public enum ExistingConditionEnum {
    DIABETES("Diabetes"),
    HYPERTENSION("Hypertension"),
    HEART_DISEASE("Heart Disease"),
    RESPIRATORY_DISEASE("Respiratory Disease"),
    TUBERCULOSIS("Tuberculosis"),
    ASTHMA("Asthma"),
    OBESITY("Obesity"),
    KIDNEY_DISEASE("Kidney Disease"),
    ANEMIA("Anemia"),
    LIVER_DISEASE("Liver Disease"),
    THYROID_DISORDER("Thyroid Disorder"),
    DEPRESSION("Depression"),
    ANXIETY("Anxiety"),
    OSTEOARTHRITIS("Osteoarthritis"),
    MALNUTRITION("Malnutrition"),
    IBS("IBS"),
    IBD("IBD"),
    GUT_DISORDER("Gut Disorder"),
    CANCER("Cancer"),
    SLEEP_DISORDERS("Sleep Disorders"),
    AUTOIMMUNE_CONDITIONS("Autoimmune Conditions"),
    SKIN_DISORDERS("Skin Disorders");

    private final String displayName;

    ExistingConditionEnum(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

