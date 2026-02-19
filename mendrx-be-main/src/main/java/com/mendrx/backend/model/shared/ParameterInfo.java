package com.mendrx.backend.model.shared;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

public final class ParameterInfo {
        private final double minValue;
        private final double maxValue;
		private final double standardMinValue;
		private final double standardMaxValue;
        private final String shortDescription;
		private final String panelName;
		private final Boolean isPrimary;
		private final double calibration;




	@JsonCreator
	public ParameterInfo(
			@JsonProperty("minValue") double minValue,
			@JsonProperty("maxValue") double maxValue,
			@JsonProperty("standardMinValue")double standardMinValue,
			@JsonProperty("standardMaxValue")double standardMaxValue,
			@JsonProperty("shortDescription") String shortDescription,
			@JsonProperty("panelName") String panelName,
			@JsonProperty("isPrimary") Boolean isPrimary,
			@JsonProperty("calibration") double calibration) {
		this.minValue = minValue;
		this.maxValue = maxValue;
		this.standardMinValue = standardMinValue;
		this.standardMaxValue = standardMaxValue;
		this.shortDescription = shortDescription;
		this.panelName = panelName;
		this.isPrimary = isPrimary;
		this.calibration = calibration;
	}

		public String getShortDescription() {
			return shortDescription;
		}
		
		public String getPanelName() {
			return panelName;
		}

		public double getStandardMinValue() {
			return standardMinValue;
		}

		public double getStandardMaxValue() {
			return standardMaxValue;
		}

		public double getMinValue() {
            return minValue;
        }

		public Boolean getIsPrimary() {
			return isPrimary;
		}

		public double getCalibration() {
			return calibration;
		}

		public double getMaxValue() {
            return maxValue;
        }

	@Override
	public String toString() {
		return String.format("Min: %.1f, Max: %.1f",
				minValue, maxValue);
	}
    }
