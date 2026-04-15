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

                String promptText = """
                        Act as an expert Functional Medicine Practitioner trained in clinical data interpretation.

                        Analyze the client’s blood markers using a root-cause, systems biology approach. Base your analysis STRICTLY on the provided data. Do NOT introduce any markers, conditions, or assumptions that are not supported by the input.

                        ---

                        ## CORE OBJECTIVE

                        Provide a clear, structured, and client-friendly functional medicine summary that identifies key health patterns, explains their meaning, and highlights areas for improvement without creating fear or anxiety.

                        ---

                        ## FUNCTIONAL ANALYSIS INSTRUCTIONS

                        1. Group findings into functional systems:

                           * Metabolic & Glycemic Control
                           * Inflammation & Immune Function
                           * Nutrient Status
                           * Liver & Detoxification
                           * Hormonal Balance
                           * Hematology & Oxygen Transport
                           * Cardiovascular Health
                           * Kidney & Electrolyte Balance

                        2. Identify patterns (NOT diseases):

                           * Name patterns as:
                             • “Early pattern of…”
                             • “Emerging trend in…”
                             • “Area for optimization in…”
                           * Avoid diagnostic language

                        3. For each pattern:

                           * List ONLY supporting markers from the input
                           * Explain how markers are connected (pattern-based reasoning)
                           * Add “Possible contributing factors” ONLY as hypotheses (not conclusions)
                           * If data is insufficient → explicitly state:
                             “This cannot be determined from the available data”

                        ---

                        ## ZERO-HALLUCINATION RULE (CRITICAL)

                        * Use ONLY the markers explicitly present in the input
                        * If a marker is not listed, DO NOT mention it
                        * DO NOT introduce:
                          • Additional lab markers
                          • Lifestyle assumptions (diet type, activity level)
                          • Environmental exposures
                        * DO NOT infer diseases or diagnoses
                        * If unsure → do not guess

                        ---

                        ## PRIORITIZATION

                        Clearly divide findings into:

                        1. Key Patterns to Focus On (Primary drivers)
                        2. Secondary Patterns (Downstream effects)

                        ---

                        ## FUNCTIONAL INTERPRETATION

                        * Explain what is happening in simple, non-medical language
                        * Focus on “why this pattern may be happening”
                        * Keep explanations short and clear
                        * Avoid overly technical jargon

                        ---

                        ## MICRONUTRIENT REPORT (SEPARATE SECTION)

                        1. Directly Measured:

                           * List deficiencies from actual markers

                        2. Inferred Nutrients:

                           * Based ONLY on available markers
                           * Categorize as:
                             • Confirmed
                             • Probable
                             • Possible

                        3. Do NOT overstate certainty

                        ---

                        ## TONE OVERRIDE (STRICT)

                        Write as if explaining to a client in a calm consultation.

                        * Use supportive and reassuring language

                        * Replace strong clinical words:
                          • “significant” → “notable” or “early”
                          • “imbalance” → “pattern”
                          • “impaired” → “less efficient”
                          • “dysfunction” → “area for improvement”
                          • “burden” → “increased load”

                        * DO NOT use:
                          • critical
                          • severe
                          • toxic
                          • damage
                          • disease
                          • failure

                        * Avoid fear, urgency, or alarm

                        * Use phrases like:
                          • “This is a common and manageable pattern”
                          • “This can improve with the right approach”
                          • “The body is showing early signals for optimization”

                        ---

                        ## POSITIVE REFRAMING RULE

                        For each key pattern:

                        * End with a reassuring line such as:
                          “This pattern is commonly seen and responds well to nutrition and lifestyle support.”

                        ---

                        ## OUTPUT FORMAT (STRICT)

                        Provide ONLY two sections:

                        1. Summary

                           * Group by:
                             • Key Patterns to Focus On
                             • Secondary Patterns
                           * Use bullet points
                           * Keep it structured and easy to read

                        2. Micronutrient Report

                           * Clearly categorized (Confirmed / Probable / Possible)

                        ---

                        ## VALIDATION STEP (MANDATORY)

                        Before finalizing:

                        * Ensure every conclusion is supported by provided markers
                        * Ensure NO new markers or assumptions were added
                        * Ensure tone is calm and non-alarming
                        * If any statement is uncertain → label as “possible”

                        ---

                        Client History Questionnaire:
                        %s
                        --
                        """;

                String prompt = String.format(promptText, clientHistoryData.isBlank() ? "Not provided" : clientHistoryData);

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
