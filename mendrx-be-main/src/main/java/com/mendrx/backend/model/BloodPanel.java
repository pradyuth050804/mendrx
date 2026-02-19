package com.mendrx.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.enums.BloodPanelStatusEnum;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import java.util.Objects;

public final class BloodPanel {
	@JsonProperty("name")
	private final String name;
	@JsonProperty("healthScore")
	private final String healthScore;
	@JsonProperty("status")
	@Enumerated(EnumType.STRING)
	private final BloodPanelStatusEnum status;

	private static final ObjectMapper mapper = new ObjectMapper();

	public BloodPanel(String name, String healthScore, BloodPanelStatusEnum status) {
		this.name = name;
		this.healthScore = healthScore;
		this.status = status;
	}

	public String getName() {
		return name;
	}

	public String getHealthScore() {
		return healthScore;
	}

	public BloodPanelStatusEnum getStatus() {
		return status;
	}

	@Override
	public String toString() {
		try {
			return mapper.writeValueAsString(this);
		} catch (JsonProcessingException e) {
			// Fallback toString if JSON serialization fails
			return String.format("{\"name\":\"%s\",\"healthScore\":\"%s\",\"status\":\"%s\"}",
					name, healthScore, status);
		}
	}

	@Override
	public int hashCode() {
		return Objects.hash(name);
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		BloodPanel other = (BloodPanel) obj;
		return Objects.equals(name, other.name);
	}
}