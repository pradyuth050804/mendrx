package com.mendrx.backend.service;

import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.api.GenerationConfig;
import com.google.cloud.vertexai.generativeai.ContentMaker;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.PartMaker;
import com.mendrx.backend.exception.AIResponseFailedException;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class NotesPromptService {
    private static final Logger logger = LoggerFactory.getLogger(NotesPromptService.class);

    @Value("${google.cloud.vertex-ai-project-id}")
    private String vertexAiProjectId;

    @Value("${google.cloud.vertex-ai.location}")
    private String location;

    @Value("${google.cloud.vertex-ai.global-endpoint}")
    private String endpoint;

    @Retryable(
            retryFor = { Exception.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 1000, multiplier = 2))
    public String getNotes(String jsonData, String clientHistoryData) throws AIResponseFailedException {

        StringBuffer sb = new StringBuffer();

        GenerateContentResponse responseStream = null;

        try {
            try (VertexAI vertexAi = new VertexAI.Builder()
                    .setProjectId(vertexAiProjectId)
                    .setLocation("global")
                    .setApiEndpoint(endpoint)
                    .build()) {

                GenerationConfig generationConfig = GenerationConfig.newBuilder()
                        .setTemperature(0F).setTopP(0.95F).build();
                GenerativeModel model = new GenerativeModel.Builder().setModelName("gemini-2.5-pro")
                        .setVertexAi(vertexAi).setGenerationConfig(generationConfig)
                        .build();

                var document1 = PartMaker.fromMimeTypeAndData("text/plain", jsonData.getBytes());

                String prompt = clientHistoryData.isBlank() ? "Summarise the report based on the dysfunctions grouping the parameters contributing to the dysfunction by blood panel. Also call out the correlated parameters justifying the dysfunction. Create a separate section to brief micronutrients report. If the direct micronutrient values not present, then list the possible deficiency based on other correlated parameters. Provide only two sections \"Summary\" and \"Micronutrient Report\". Don't include personal information. Use the word client instead of patient. Make it easy to read and understand." :
                        String.format("Summarise the report based on the dysfunctions grouping the parameters contributing to the dysfunction by blood panel. Also Call out the correlated parameters justifying the dysfunction. Create a separate section to brief micronutrients report. If the direct micronutrient values not present, then list the possible deficiency based on other correlated parameters. Provide only two sections \"Summary\" and \"Micronutrient Report\". Consider Client history questionnaire : %s.  Don't include personal information. Use the word client instead of patient. Make it easy to read and understand.", clientHistoryData);

                var content = ContentMaker.fromMultiModalData(document1, prompt);
                responseStream = model.generateContent(content);

                if (responseStream != null && !responseStream.getCandidatesList().isEmpty()) {
                    responseStream.getCandidatesList().forEach(t -> sb.append(t.getContent().getParts(0).getText()));
                    return sb.toString();
                } else {
                    String errorMsg = "No valid response received for notes generation";
                    throw new IOException(errorMsg);
                }
            }
        } catch (Exception e) {
            String errorMsg = "Notes generation failed: " + e.getMessage();
            //LoggingUtils.logError(logger, errorMsg);
            throw new AIResponseFailedException("AI response failed during notes generation", e);
        }
    }
}
