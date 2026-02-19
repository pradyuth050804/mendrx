package com.mendrx.backend.util.converter;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterInfo;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.io.IOException;
import java.util.List;

@Converter
public class BloodMarkerListConverter implements AttributeConverter<List<BloodMarker>, String> {
    private final ObjectMapper objectMapper = new ObjectMapper()
            .addMixIn(ParameterData.class, ParameterDataMixin.class);

    private interface ParameterDataMixin {
        @JsonIgnore
        ParameterInfo getParameterDetails();
    }

    @Override
    public String convertToDatabaseColumn(List<BloodMarker> attribute) {
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error converting list to JSON", e);
        }
    }

    @Override
    public List<BloodMarker> convertToEntityAttribute(String dbData) {
        try {
            return objectMapper.readValue(dbData, new TypeReference<List<BloodMarker>>() {});
        } catch (IOException e) {
            throw new RuntimeException("Error converting JSON to list", e);
        }
    }
}