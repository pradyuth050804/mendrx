package com.mendrx.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Deviation {
    private String marker;
    @JsonProperty("deviation_reason")
    private String deviationReason;

    public String getMarker() {
        return marker;
    }

    public void setMarker(String marker) {
        this.marker = marker;
    }

    public Deviation(String marker, String deviationReason) {
        this.marker = marker;
        this.deviationReason = deviationReason;
    }

    public String getDeviationReason() {
        return deviationReason;
    }

    public void setDeviationReason(String deviation_reason) {
        this.deviationReason = deviation_reason;
    }
}
