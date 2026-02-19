package com.mendrx.backend.model;

import java.util.List;

public class PossibleReasons {
    private List<Deviation> deviations;

    public List<Deviation> getDeviations() {
        return deviations;
    }

    public PossibleReasons(List<Deviation> deviations) {
        this.deviations = deviations;
    }

    public void setDeviations(List<Deviation> deviations) {
        this.deviations = deviations;
    }
}
