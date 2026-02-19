package com.mendrx.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.api.GenerationConfig;
import com.google.cloud.vertexai.generativeai.ContentMaker;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.PartMaker;
import com.mendrx.backend.exception.AIResponseFailedException;
import com.mendrx.backend.model.PossibleReasons;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.util.LoggingUtils;
import com.mendrx.backend.util.converter.ReasonsConverter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReasoningPromptService {

    private static final Logger logger = LoggerFactory.getLogger(ReasoningPromptService.class);

    @Value("${google.cloud.vertex-ai-project-id}")
    private String vertexAiProjectId;

    @Value("${google.cloud.vertex-ai.location}")
    private String location;

    @Value("${google.cloud.vertex-ai.global-endpoint}")
    private String endpoint;

    private final static String PROMPT = """
            You are a highly advanced medical assistant trained with a functional medicine background in blood marker analysis. Using the provided input data, generate a strict JSON output that lists each blood marker with its corresponding deviation reason.
            
            Input details:
            - Blood Markers with Deviations: A list of blood markers with result and deviation percentages.
            - Possible Reasons for Blood Marker Deviations: A detailed set of potential causes for abnormal markers.
            - Client Information:
                - Gender
                - Age
                - Height
                - Weight
                - Waist circumference
                - Diet (Vegetarian or Non-Vegetarian)
                - Lifestyle habits (e.g., smoking, alcohol consumption, exercise)
                - Existing health conditions
                - Client history questionnaire
            
            Output Requirements:
            1. Strict JSON Structure:
                - Output should be strictly in JSON.
                - Each marker must be a separate object with a 'marker' and 'deviation_reason' key.
                - Do not group markers even if reasons are similar.
            
            2. Reasoning Style Instructions:
                - Write deviation reasons in a narrative clinical explanation style.
                - Do NOT use numbered lists, bullet points, or enumerations.
                - Reasons must be written in full sentences, flowing as a cohesive explanation.
                - Use medical terminology precisely but keep it readable.
                - Avoid phrases like "1.", "Firstly", "Secondly", or "Another reason is".
                - Seamlessly weave multiple reasons into a connected paragraph.
            
            3. Analytical Depth:
                - Use client information holistically.
                - Cross-analyze interdependencies between markers to avoid conflicting reasons.
                - Rule out contradicting causes based on client details and marker context.
                - Suggest further tests only if essential, and explain why they are needed in the deviation_reason.
            
            4. Example format:
            {
             "deviations": [
              {
               "marker": "Cholesterol",
               "deviation_reason": "High levels are likely influenced by a non-vegetarian diet rich in saturated fats, combined with limited physical activity. The client's existing hypertension further amplifies cardiovascular risk."
              },
              {
               "marker": "Vitamin D",
               "deviation_reason": "Low levels appear to result from inadequate sunlight exposure and possible dietary insufficiency. A higher BMI suggests reduced bioavailability, compounding the deficiency."
              }
             ]
            }
            
            Generate the output accordingly.
            
            """;

    private String cleanResponse(String response) {
        if (response == null || response.trim().isEmpty()) {
            return "";
        }

        // Remove JSON code block markers and any extra whitespace
        return response.replaceAll("^```json\\s*|\\s*```$", "").trim();
    }

    @Retryable(
            retryFor = { Exception.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2))
    public PossibleReasons getPossibleReasons(Report report, List<String> bloodMarkersStringList) throws AIResponseFailedException {

        StringBuffer sb = new StringBuffer();

        GenerateContentResponse responseStream = null;
        try {
            try (VertexAI vertexAi = new VertexAI.Builder()
                    .setProjectId(vertexAiProjectId)
                    .setLocation("global")
                    .setApiEndpoint(endpoint)
                    .build()) {

                GenerationConfig generationConfig = GenerationConfig.newBuilder()
                        .setTemperature(1F).setTopP(0.95F).build();
                GenerativeModel model = new GenerativeModel.Builder().setModelName("gemini-2.5-pro")
                        .setVertexAi(vertexAi).setGenerationConfig(generationConfig)
                        .build();

                ObjectMapper objectMapper = new ObjectMapper();

                String jsonData = objectMapper.writeValueAsString(bloodMarkersStringList) + "\n" + report.getString();

                var document1 = PartMaker.fromMimeTypeAndData("text/plain", jsonData.getBytes());
                var content = ContentMaker.fromMultiModalData(document1, PROMPT);
                responseStream = model.generateContent(content);

                responseStream.getCandidatesList().forEach(t -> sb.append(t.getContent().getParts(0).getText()));
                String cleanedResponse = cleanResponse(sb.toString());
                return ReasonsConverter.convertToPossibleReasons(cleanedResponse);
            }
        } catch (Exception e) {
            String errorMsg = "AI response failed during deviations generation";
            LoggingUtils.logError(logger, "Reasoning service failed with error: {}", e.getMessage());
            throw new AIResponseFailedException(errorMsg, e);
        }
    }

    @Recover
    public String recover(io.grpc.StatusRuntimeException e, String jsonData) {
        // Fallback logic after retries are exhausted (optional)
        return "Fallback response due to: " + e.getStatus();
    }
}
