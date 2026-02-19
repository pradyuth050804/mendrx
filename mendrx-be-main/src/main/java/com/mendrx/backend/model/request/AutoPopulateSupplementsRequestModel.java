package com.mendrx.backend.model.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

// Auto-populate request model
public class AutoPopulateSupplementsRequestModel {

    @NotEmpty(message = "Supplement names list cannot be empty")
    private List<String> supplementNames;

    public List<String> getSupplementNames() {
        return supplementNames;
    }

    public void setSupplementNames(List<String> supplementNames) {
        this.supplementNames = supplementNames;
    }
}