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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class DietConfigPromptService {
    private static final Logger logger = LoggerFactory.getLogger(DietConfigPromptService.class);

    @Value("${google.cloud.vertex-ai-project-id}")
    private String vertexAiProjectId;

    @Value("${google.cloud.vertex-ai.location}")
    private String location;

    @Value("${google.cloud.vertex-ai.global-endpoint}")
    private String endpoint;

    @Retryable(retryFor = { Exception.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public String generateDietConfig(String bloodMarkersJson) throws AIResponseFailedException {

        StringBuffer sb = new StringBuffer();

        try {
            try (VertexAI vertexAi = new VertexAI.Builder()
                    .setProjectId(vertexAiProjectId)
                    .setLocation("global")
                    .setApiEndpoint(endpoint)
                    .build()) {

                GenerationConfig generationConfig = GenerationConfig.newBuilder()
                        .setTemperature(0.1F)
                        .setTopP(0.8F)
                        .build();

                GenerativeModel model = new GenerativeModel.Builder()
                        .setModelName("gemini-2.5-flash")
                        .setVertexAi(vertexAi)
                        .setGenerationConfig(generationConfig)
                        .build();

                var document = PartMaker.fromMimeTypeAndData("text/plain", bloodMarkersJson.getBytes());

                String promptText = """
                        You are an expert Functional Medicine Nutritionist. Your task is to analyze the provided blood marker data and suggest a personalized diet configuration.

                        ANALYZE the blood markers and analysis data provided, then SELECT the most clinically appropriate options from the EXACT lists below.

                        ---

                        ## AVAILABLE OPTIONS (You MUST only select from these exact strings)

                        ### Primary Diet (select exactly 1):
                        - "Gut Healing Diet"
                        - "Elimination Diet"
                        - "Metabolism Balance Diet"
                        - "Anti-Inflammatory Diet"
                        - "Nutrient Repletion Diet"
                        - "Liver Support Diet"
                        - "Weight Gain Diet"
                        - "Fat Loss Diet"
                        - "Hormone Balance Diet"

                        ### Support Diets (select 0-2, must NOT duplicate primary):
                        - "Nutrient Repletion"
                        - "Metabolic Balance"
                        - "Anti-inflammatory"
                        - "Gut Healing"
                        - "Hormone Support"
                        - "Liver Support"

                        ### Modifiers (select 0 or more as clinically appropriate):
                        - "Dairy-Free"
                        - "Gluten-Free"
                        - "Soy-Free"
                        - "Low FODMAP"
                        - "Low Fiber (acute phase)"
                        - "High Fiber"
                        - "Low Carb"
                        - "Moderate Carb"
                        - "High Protein"
                        - "Early Dinner (before 7 pm)"
                        - "Time Restricted Eating (12/12, 14/10, 16/8)"
                        - "Anti-inflammatory emphasis"

                        ### Diet Type (select exactly 1):
                        - "Vegetarian"
                        - "Eggetarian"
                        - "Non-Vegetarian"

                        ### Cuisine (select exactly 1):
                        - "South Indian"
                        - "North Indian"
                        - "Mixed Indian"
                        - "Custom"

                        ### Meal Frequency (select exactly 1):
                        - "3 meals"
                        - "4 meals"
                        - "5 meals"

                        ### Calorie Strategy (select exactly 1):
                        - "Auto"
                        - "Mild Deficit"
                        - "Aggressive Deficit"
                        - "Maintenance"
                        - "Surplus (Weight Gain)"

                        ### Protein Target (select exactly 1):
                        - "Low (0.6 g/kg)"
                        - "Moderate (0.8 g/kg)"
                        - "High (1–1.2 g/kg)"

                        ### Clinical Conditions (select 0 or more if indicated by markers):
                        - "Diabetes"
                        - "Thyroid Disorder"
                        - "PCOS"
                        - "IBS"
                        - "Fatty Liver"
                        - "Anemia"

                        ---

                        ## CLINICAL DECISION RULES

                        PRIMARY DIET selection priority:
                        1. BMI underweight OR weight-related markers indicate undernutrition → "Weight Gain Diet"
                        2. hsCRP/CRP elevated OR inflammation markers high → "Anti-Inflammatory Diet"
                        3. Liver enzymes elevated (ALT, AST, GGT) → "Liver Support Diet"
                        4. Gut issues present (IBS, IBD, digestive complaints) → "Gut Healing Diet"
                        5. Metabolic issues (glucose, HbA1c, triglycerides abnormal) → "Metabolism Balance Diet"
                        6. Multiple hormonal markers abnormal → "Hormone Balance Diet"
                        7. BMI overweight/obese with no specific dysfunction → "Fat Loss Diet"
                        8. Default: "Nutrient Repletion Diet"

                        SUPPORT DIETS: Select based on secondary dysfunctions NOT covered by primary diet.

                        MODIFIERS:
                        - Lactose intolerance → "Dairy-Free"
                        - Gluten sensitivity → "Gluten-Free"
                        - IBS or severe gut issues → "Low FODMAP"
                        - Fiber deficiency (no acute gut inflammation) → "High Fiber"
                        - Acute gut inflammation → "Low Fiber (acute phase)"
                        - Elevated glucose/HbA1c → "Low Carb"
                        - Low albumin or protein markers → "High Protein"
                        - CONFLICT: Do NOT select both "Low FODMAP" and "High Fiber" together
                        - CONFLICT: Do NOT select "Low Carb" with "Weight Gain Diet"

                        PREFERENCES:
                        - Underweight → "5 meals", "Surplus (Weight Gain)", "High (1–1.2 g/kg)"
                        - Overweight → "3 meals", "Mild Deficit"
                        - Low albumin → "High (1–1.2 g/kg)"

                        CONDITIONS: Map from blood markers:
                        - Glucose/HbA1c elevated → "Diabetes"
                        - TSH abnormal → "Thyroid Disorder"
                        - IBS indicators → "IBS"
                        - Liver enzymes elevated → "Fatty Liver"
                        - Low hemoglobin → "Anemia"

                        ---

                        ## OUTPUT FORMAT (STRICT JSON ONLY)

                        Return ONLY valid JSON, no markdown, no code blocks, no explanation. Use this exact schema:

                        {
                          "primaryDiet": "<exact string from list>",
                          "supportDiets": ["<exact string>", "<exact string>"],
                          "modifiers": ["<exact string>"],
                          "preferences": {
                            "dietType": "<exact string>",
                            "cuisine": "<exact string>",
                            "mealFrequency": "<exact string>",
                            "calorieStrategy": "<exact string>",
                            "proteinTarget": "<exact string>"
                          },
                          "conditions": ["<exact string>"]
                        }

                        ---

                        ## VALIDATION (MANDATORY)

                        Before outputting:
                        1. Every string value MUST be from the exact options listed above
                        2. supportDiets must NOT duplicate the primary diet category
                        3. supportDiets must have at most 2 items
                        4. No conflicting modifiers (Low FODMAP + High Fiber, Low Carb + Weight Gain)
                        """;

                var content = ContentMaker.fromMultiModalData(document, promptText);
                GenerateContentResponse responseStream = model.generateContent(content);

                if (responseStream != null && !responseStream.getCandidatesList().isEmpty()) {
                    responseStream.getCandidatesList().forEach(t -> sb.append(t.getContent().getParts(0).getText()));
                    return sb.toString();
                } else {
                    throw new IOException("No valid response received for diet config generation");
                }
            }
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Diet config generation failed: {}", e.getMessage());
            throw new AIResponseFailedException("AI response failed during diet config generation", e);
        }
    }
}
