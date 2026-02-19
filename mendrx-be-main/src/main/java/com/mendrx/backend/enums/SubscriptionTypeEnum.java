package com.mendrx.backend.enums;

public enum SubscriptionTypeEnum {
    FREE_TRIAL(1),
    ONE_MONTH(1),
    THREE_MONTH(3),
    SIX_MONTH(6),
    TWELVE_MONTH(12);

    private final int months;

    // Constructor
    SubscriptionTypeEnum(int months) {
        this.months = months;
    }

    public int getMonths() {
        return months;
    }
}

