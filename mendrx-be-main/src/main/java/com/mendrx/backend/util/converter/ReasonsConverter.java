package com.mendrx.backend.util.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.mendrx.backend.model.Deviation;
import com.mendrx.backend.model.PossibleReasons;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

public class ReasonsConverter {
    private static final Logger logger = LoggerFactory.getLogger(ReasonsConverter.class);

    // Configure ObjectMapper to handle unescaped control characters using the non-deprecated approach
    private static final ObjectMapper objectMapper = JsonMapper.builder()
            .enable(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS)
            .build();

    public static PossibleReasons convertToPossibleReasons(String jsonString) throws JsonProcessingException {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            LoggingUtils.logError(logger, "Input JSON string is null or empty");
            return new PossibleReasons(new ArrayList<>());
        }

        try {
            // Parse the JSON string
            JsonNode rootNode = objectMapper.readTree(jsonString);
            JsonNode deviationsNode = rootNode.get("deviations");

            if (deviationsNode == null || !deviationsNode.isArray()) {
                LoggingUtils.logError(logger, "Invalid JSON structure: 'deviations' array not found");
                return new PossibleReasons(new ArrayList<>());
            }

            // Convert JSON array to List of Deviation objects
            List<Deviation> deviations = new ArrayList<>();
            for (JsonNode deviationNode : deviationsNode) {
                String marker = deviationNode.get("marker").asText();
                String reason = deviationNode.get("deviation_reason").asText();
                deviations.add(new Deviation(marker, reason));
            }

            return new PossibleReasons(deviations);

        } catch (JsonProcessingException e) {
            LoggingUtils.logError(logger, "Error parsing JSON string: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Unexpected error while converting reasons: {}", e.getMessage());
            throw e;
        }
    }
}