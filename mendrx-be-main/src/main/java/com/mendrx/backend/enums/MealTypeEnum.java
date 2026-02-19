package com.mendrx.backend.enums;

public enum MealTypeEnum {
    PRE_MORNING("pre_morning"),
    MORNING("morning"),
    MID_MORNING("mid_morning"),
    LUNCH("lunch"),
    EARLY_EVENING("early_evening"),
    NIGHT("night"),
    BEDTIME("bedtime");

    private final String value;

    MealTypeEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static MealTypeEnum fromValue(String value) {
        for (MealTypeEnum mealType : MealTypeEnum.values()) {
            if (mealType.value.equals(value)) {
                return mealType;
            }
        }
        throw new IllegalArgumentException("Invalid meal type: " + value);
    }
}