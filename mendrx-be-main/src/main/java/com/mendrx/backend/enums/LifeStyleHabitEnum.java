package com.mendrx.backend.enums;

public enum LifeStyleHabitEnum {
    SEDENTARY_LIFESTYLE("Sedentary Lifestyle"),
    SMOKING("Smoking"),
    ALCOHOL_CONSUMPTION("Alcohol Consumption"),
    LACK_OF_PHYSICAL_ACTIVITY("Lack of Physical Activity"),
    CHRONIC_STRESS("Chronic Stress"),
    OVERWORK("Overwork"),
    EXCESSIVE_SCREEN_TIME("Excessive Screen Time");

    private final String displayName;

    LifeStyleHabitEnum(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

