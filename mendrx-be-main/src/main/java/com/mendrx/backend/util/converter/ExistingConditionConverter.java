package com.mendrx.backend.util.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.enums.ExistingConditionEnum;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

@Converter
public class ExistingConditionConverter implements AttributeConverter<Set<ExistingConditionEnum>, String> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(Set<ExistingConditionEnum> attribute) {
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error converting existing conditions to JSON", e);
        }
    }

    @Override
    public Set<ExistingConditionEnum> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new HashSet<>();
        }
        try {
            return objectMapper.readValue(dbData, new TypeReference<Set<ExistingConditionEnum>>() {});
        } catch (IOException e) {
            throw new RuntimeException("Error converting JSON to existing conditions", e);
        }
    }
}