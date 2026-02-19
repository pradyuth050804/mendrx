package com.mendrx.backend.model.shared;

import com.mendrx.backend.enums.BloodMarkerResultEnum;
import io.micrometer.common.util.StringUtils;

public class BloodMarker extends ParameterData{
    @Override
	public String toString() {
        String possibleReasonsString = StringUtils.isBlank(reason)?"":", possible reasons=" + reason;
		return "BloodMarker:" + super.getParameterName() + " [result=" + result + ", deviation=" + deviation +possibleReasonsString + "]";
	}

	private BloodMarkerResultEnum result;
	private int deviation;
	private String reason;
	
    public int getDeviation() {
		return deviation;
	}


	public void setDeviation(int deviation) {
		this.deviation = deviation;
	}

	

    public BloodMarker() {
        super();
    }

	public BloodMarker(String parameterName, String value, String units, BloodMarkerResultEnum result, String reason) {
        super(parameterName, value, units);
        this.result = result;
        this.reason = reason;
    }

    public BloodMarkerResultEnum getResult() {
        return result;
    }

    public String getReason() {
        return reason;
    }

    public void setResult(BloodMarkerResultEnum result) {
        this.result = result;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
