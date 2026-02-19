package com.mendrx.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mendrx.backend.model.SnDPlan;
import com.mendrx.backend.model.Supplement;
import com.mendrx.backend.model.SupplementBrandGuideline;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.SupplementBrandSuggestionResponseModel;
import com.mendrx.backend.repository.SnDPlanRepository;
import com.mendrx.backend.repository.SupplementBrandGuidelineRepository;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SupplementAutoPopulateService {

    private static final Logger logger = LoggerFactory.getLogger(SupplementAutoPopulateService.class);

    @Value("${google.cloud.vertex-ai-project-id}")
    private String vertexAiProjectId;

    @Value("${google.cloud.vertex-ai.location}")
    private String location;

    @Value("${google.cloud.vertex-ai.global-endpoint}")
    private String endpoint;

    @Autowired
    private SupplementBrandGuidelineRepository supplementRepository;

    @Autowired
    private SnDPromptService snDPromptService;

    @Autowired
    private SnDPlanRepository snDPlanRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Auto-populate supplements with brand suggestions using AI matching
     */
    public SnDPlan autoPopulateBrandSuggestions(User user, SnDPlan snDPlan) throws IOException {

        LoggingUtils.logInfo(logger, "Starting auto-populate brand suggestions for user: {} with {} supplements",
                user.getId(), snDPlan.getSupplements().size());

        // Extract supplement names from the list
        List<String> supplementNames = snDPlan.getSupplements().stream()
                .map(Supplement::getName)
                .collect(Collectors.toList());

        // Fetch available supplement names for the user
        List<String> availableSupplementNames = supplementRepository.findSupplementNamesByParentId(user.getParent().getId());
        if (availableSupplementNames.isEmpty()) {
            LoggingUtils.logInfo(logger, "No supplement data available for user: {}", user.getId());
            return snDPlan;
        }

        // Match requested supplements with available ones using AI
        Map<String, String> matchedSupplements = parseMatchingResponse(
                snDPromptService.matchSupplementNames(supplementNames, availableSupplementNames));
        if (matchedSupplements.isEmpty()) {
            LoggingUtils.logInfo(logger, "No supplement matches found for user: {}", user.getId());
            return snDPlan;
        }

        // Update each supplement with brand suggestions if a match is found
        for (Supplement supplement : snDPlan.getSupplements()) {
            String matchedName = matchedSupplements.get(supplement.getName());
            if (matchedName != null) {
                Optional<SupplementBrandGuideline> guidelineOpt =
                        supplementRepository.findByParentIdAndSupplementNameIgnoreCase(user.getParent().getId(), matchedName);
                guidelineOpt.ifPresent(guideline -> {
                    // Format the brand suggestions and guidelines as required
                    String brandSuggestionsAndGuidelines = guideline.getBrandName() + ": " +
                            guideline.getProductLink() + "\n" +
                            guideline.getGuidelines();
                    supplement.setBrandSuggestionsAndGuidelines(brandSuggestionsAndGuidelines);
                    LoggingUtils.logInfo(logger, "Updated brand suggestions for supplement: {} -> {}",
                            supplement.getName(), matchedName);
                });
            }
        }
        return snDPlanRepository.save(snDPlan);
    }

    private Map<String, String> parseMatchingResponse(String aiResponse) throws IOException {
        Map<String, String> matches = new HashMap<>();

        try {
            // Clean the response
            String cleanResponse = aiResponse.replaceAll("^```json\\s*", "")
                    .replaceAll("\\s*```$", "")
                    .trim();

            JsonNode rootNode = objectMapper.readTree(cleanResponse);

            if (rootNode.has("matches")) {
                JsonNode matchesNode = rootNode.get("matches");
                for (JsonNode matchNode : matchesNode) {
                    if (matchNode.has("requested") && matchNode.has("matched") && matchNode.has("confidence")) {
                        String confidence = matchNode.get("confidence").asText();
                        if ("high".equalsIgnoreCase(confidence)) {
                            String requested = matchNode.get("requested").asText();
                            String matched = matchNode.get("matched").asText();
                            matches.put(requested, matched);
                        }
                    }
                }
            }

            LoggingUtils.logInfo(logger, "Parsed {} high-confidence matches from AI response", matches.size());

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error parsing AI matching response: {}", e.getMessage());
            throw new IOException("Failed to parse AI matching response: " + e.getMessage(), e);
        }

        return matches;
    }
}