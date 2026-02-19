package com.mendrx.backend.model.response;

import java.util.Map;

public class ParameterCommentsResponseModel {
    private Map<String, String> lowParameterComments;
    private Map<String, String> highParameterComments;

    public Map<String, String> getLowParameterComments() {
        return lowParameterComments;
    }

    public void setLowParameterComments(Map<String, String> lowParameterComments) {
        this.lowParameterComments = lowParameterComments;
    }

    public Map<String, String> getHighParameterComments() {
        return highParameterComments;
    }

    public void setHighParameterComments(Map<String, String> highParameterComments) {
        this.highParameterComments = highParameterComments;
    }
}
