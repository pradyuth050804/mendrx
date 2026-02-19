package com.mendrx.backend.util;

import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.service.MultiTrackerFileService.ParameterDetails;

import java.util.Collections;
import java.util.Map;

public class TrackerData {

    private final Map<String, ParameterInfo> maleData;
    private final Map<String, ParameterInfo> femaleData;
    private final Map<String, ParameterDetails> detailedData;
    private final Map<String, String> dysfunctionData;
    private final Map<String, String> parameterLowComments;
    private final Map<String, String> parameterHighComments;

    public TrackerData(Map<String, ParameterInfo> maleData,
                       Map<String, ParameterInfo> femaleData,
                       Map<String, ParameterDetails> detailedData,
                       Map<String, String> dysfunctionData,
                       Map<String, String> parameterLowComments,
                       Map<String, String> parameterHighComments) {
        this.maleData = maleData;
        this.femaleData = femaleData;
        this.detailedData = detailedData;
        this.dysfunctionData = dysfunctionData;
        this.parameterLowComments = parameterLowComments;
        this.parameterHighComments = parameterHighComments;
    }

    public Map<String, ParameterInfo> getMaleData() {
        return Collections.unmodifiableMap(maleData);
    }

    public Map<String, ParameterInfo> getFemaleData() {
        return Collections.unmodifiableMap(femaleData);
    }

    public Map<String, ParameterDetails> getDetailedData() {
        return Collections.unmodifiableMap(detailedData);
    }

    public Map<String, String> getDysfunctionData() {
        return Collections.unmodifiableMap(dysfunctionData);
    }

    public Map<String, String> getParameterLowComments() {
        return Collections.unmodifiableMap(parameterLowComments);
    }

    public Map<String, String> getParameterHighComments() {
        return Collections.unmodifiableMap(parameterHighComments);
    }
}

