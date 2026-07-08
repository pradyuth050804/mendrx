package com.mendrx.backend.service;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import com.google.cloud.vertexai.api.*;
import com.mendrx.backend.enums.BloodMarkerResultEnum;
import com.mendrx.backend.enums.DietEnum;
import com.mendrx.backend.enums.MealTypeEnum;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.request.GenerateDietPlanRequestModel;
import com.mendrx.backend.model.request.GenerateSnDPlanRequestModel;
import com.mendrx.backend.model.request.NewDietPlanRequestModel;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.generativeai.ContentMaker;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.PartMaker;

@Service
public class SnDPromptService {

	private static final Logger logger = LoggerFactory.getLogger(SnDPromptService.class);

	@Value("${google.cloud.vertex-ai-project-id}")
	private String vertexAiProjectId;

	@Value("${google.cloud.vertex-ai.location}")
	private String location;

	@Value("${google.cloud.vertex-ai.global-endpoint}")
	private String endpoint;

	private void validateSelectedMealTypes(List<String> selectedMealTypes) {
		if (selectedMealTypes != null && !selectedMealTypes.isEmpty()) {
			for (String mealType : selectedMealTypes) {
				try {
					MealTypeEnum.fromValue(mealType.toLowerCase());
				} catch (IllegalArgumentException e) {
					throw new IllegalArgumentException("Invalid meal type: " + mealType + 
						". Valid meal types are: pre_morning, morning, mid_morning, lunch, early_evening, night, bedtime");
				}
			}
		}
	}

	@Retryable(
			retryFor = { Exception.class },
			maxAttempts = 3,
			backoff = @Backoff(delay = 1000, multiplier = 2))
	public String generateSnDPlan(Report report, GenerateSnDPlanRequestModel request) throws IOException {
		validateSelectedMealTypes(request.getSelectedMealTypes());
		
		StringBuffer sb = new StringBuffer();
		String dietCustomizationsPoint = getDietCustomizationsPoint(request);
		String mealInstructions = buildMealInstructions(request.getSelectedMealTypes());
		String dietPlanExample = buildExampleDietPlan(request.getSelectedMealTypes(), false);

		String sevenDayPrompt = String.format(
				"""
                You are an expert functional nutritionist. Create a personalized supplements and diet plan in JSON format based on the provided input details.
        
                Input Details:
                %s
                Blood Markers with Deviations:
                %s
        
                Output Requirements:
                1. Supplements Plan:
                Create a supplements plan based on deviated parameters. Consider only nutraceuticals for supplements. Each supplement should have:
                - name: Supplement name
                - purpose: Why it's recommended
                - timing: Best time to take it
                - dosage: Recommended dose
                - precautions: Warnings or considerations
                - timing_category: The value must be mandatorily be one of the 3 strings: morning, afternoon, night
        
                2. Diet Plan:
                Design a 7-day diet plan that's %s. Include only the following meal types:
                %s
        
                Example Supplement Plan:
                {
                  "supplements": [
                    {
                      "name": "Vitamin D3",
                      "purpose": "Improve Vitamin D levels and support thyroid function",
                      "timing": "Morning with food",
                      "dosage": "4000 IU/day",
                      "precautions": "Monitor levels after 6 weeks; avoid overdose",
                      "timing_category": "morning"
                    },
                    {
                      "name": "Curcumin",
                      "purpose": "Reduce inflammation and lower CRP levels",
                      "timing": "With meals",
                      "dosage": "500 mg/day",
                      "precautions": "Avoid in gallbladder disease",
                      "timing_category": "afternoon"
                    }
                  ]
                }
        
                Example Diet Plan:
                %s
        
                IMPORTANT:
                - Ensure all recommendations are evidence-based
                - Consider age and gender-specific requirements
                - Account for existing health conditions and lifestyle habits
                - Maintain proper JSON format
                - Include detailed precautions for supplements
                %s
                """,
				report.getString(),
				getDeviatedMarkersString(report.getBloodMarkers()),
				getDietTypeString(report.getDiet()),
				mealInstructions,
				dietPlanExample,
				dietCustomizationsPoint
		);

		String singleDayPrompt = String.format(
				"""
                You are an expert functional nutritionist. Create a personalized supplements and diet plan in JSON format based on the provided input details.
        
                Input Details:
                %s
                Blood Markers with Deviations:
                %s
        
                Output Requirements:
                1. Supplements Plan:
                Create a supplements plan based on deviated parameters. Consider only nutraceuticals for supplements. Each supplement should have:
                - name: Supplement name
                - purpose: Why it's recommended
                - timing: Best time to take it
                - dosage: Recommended dose
                - precautions: Warnings or considerations
                - timing_category: The value must be mandatorily be one of the 3 strings: morning, afternoon, night
        
                2. Diet Plan:
                Design a 1-day diet plan that's %s. Include only the following meal types:
                %s
                
                For each section provide 5 options. Let each option be separated by newline character.
        
                Example Supplement Plan:
                {
                  "supplements": [
                    {
                      "name": "Vitamin D3",
                      "purpose": "Improve Vitamin D levels and support thyroid function",
                      "timing": "Morning with food",
                      "dosage": "4000 IU/day",
                      "precautions": "Monitor levels after 6 weeks; avoid overdose",
                      "timing_category": "morning"
                    },
                    {
                      "name": "Curcumin",
                      "purpose": "Reduce inflammation and lower CRP levels",
                      "timing": "With meals",
                      "dosage": "500 mg/day",
                      "precautions": "Avoid in gallbladder disease",
                      "timing_category": "afternoon"
                    }
                  ]
                }
        
                Example Diet Plan:
                %s
        
                IMPORTANT:
                - Ensure all recommendations are evidence-based
                - Consider age and gender-specific requirements
                - Account for existing health conditions and lifestyle habits
                - Maintain proper JSON format
                - Include detailed precautions for supplements
                - Diet should be culturally appropriate
                %s
                """,
				report.getString(),
				getDeviatedMarkersString(report.getBloodMarkers()),
				getDietTypeString(report.getDiet()),
				mealInstructions,
				buildExampleDietPlan(request.getSelectedMealTypes(), true),
				dietCustomizationsPoint
		);

		try {
			try (VertexAI vertexAi = new VertexAI.Builder()
					.setProjectId(vertexAiProjectId)
					.setLocation("global")
					.setApiEndpoint(endpoint)
					.build()) {
				GenerationConfig generationConfig = GenerationConfig.newBuilder()
						.setTemperature(0.7F)  // Slightly higher for creative but consistent output
						.setTopP(0.95F)
						.build();

				GenerativeModel model = new GenerativeModel.Builder()
						.setModelName("gemini-2.5-pro")
						.setVertexAi(vertexAi)
						.setGenerationConfig(generationConfig)
						.build();

				var document = PartMaker.fromMimeTypeAndData("text/plain", request.getSingleDayPlan() ? singleDayPrompt.getBytes() : sevenDayPrompt.getBytes());
				var content = ContentMaker.fromMultiModalData(document);
				GenerateContentResponse responseStream = model.generateContent(content);

				responseStream.getCandidatesList()
						.forEach(t -> sb.append(t.getContent().getParts(0).getText()));
			}
		} catch (Exception e) {
			LoggingUtils.logError(logger, "generateSnDPlan attempt failed: {}", e.getMessage());
			throw e;
		}

		return sb.toString();
	}

	private static String getDietCustomizationsPoint(GenerateSnDPlanRequestModel request) {
		StringBuilder customizations = new StringBuilder();

		if (request.getIncludeCalorieBreakdown()) {
			customizations.append("- Must include comprehensive calorie breakdown with macronutrient and micronutrient distribution for each meal.\n");
		}

		if (request.getIncludeFoodMeasurements()) {
			customizations.append("- Provide precise portion measurements and serving sizes (grams, cups, or standard servings).\n");
		}

		if (request.getMaxCaloriesPerDay() != null && request.getMaxCaloriesPerDay() > 0) {
			customizations.append(String.format("- Maintain daily caloric target within %d kcal per day.\n", request.getMaxCaloriesPerDay()));
		}

		if (!request.getFoodInclusions().trim().isEmpty()) {
			customizations.append(String.format("- Therapeutic inclusions: Incorporate the following foods/nutrients to support client's health goals: %s\n", request.getFoodInclusions()));
		}

		if (!request.getFoodExclusions().trim().isEmpty()) {
			customizations.append(String.format("- Clinical restrictions: Strictly avoid the following due to contraindications or sensitivities: %s\n", request.getFoodExclusions()));
		}

		if (!request.getPreferredCuisines().trim().isEmpty()) {
			customizations.append(String.format("- Cultural considerations: Incorporate flavors and cooking methods from these dietary patterns for better client compliance: %s\n", request.getPreferredCuisines()));
		}

		return customizations.toString().trim().isEmpty() ? "" : "\nTherapeutic Dietary Protocol:\n" + customizations.toString();
	}

	private static String getDietCustomizationsPoint(GenerateDietPlanRequestModel request) {
		StringBuilder customizations = new StringBuilder();

		if (request.getIncludeCalorieBreakdown()) {
			customizations.append("- Must include comprehensive calorie breakdown with macronutrient and micronutrient distribution for each meal.\n");
		}

		if (request.getIncludeFoodMeasurements()) {
			customizations.append("- Provide precise portion measurements and serving sizes (grams, cups, or standard servings).\n");
		}

		if (request.getMaxCaloriesPerDay() != null && request.getMaxCaloriesPerDay() > 0) {
			customizations.append(String.format("- Maintain daily caloric target within %d kcal per day.\n", request.getMaxCaloriesPerDay()));
		}

		if (!request.getFoodInclusions().trim().isEmpty()) {
			customizations.append(String.format("- Therapeutic inclusions: Incorporate the following foods/nutrients to support client's health goals: %s\n", request.getFoodInclusions()));
		}

		if (!request.getFoodExclusions().trim().isEmpty()) {
			customizations.append(String.format("- Clinical restrictions: Strictly avoid the following due to contraindications or sensitivities: %s\n", request.getFoodExclusions()));
		}

		if (!request.getPreferredCuisines().trim().isEmpty()) {
			customizations.append(String.format("- Cultural considerations: Incorporate flavors and cooking methods from these dietary patterns for better client compliance: %s\n", request.getPreferredCuisines()));
		}

		return customizations.toString().trim().isEmpty() ? "" : "\nTherapeutic Dietary Protocol:\n" + customizations.toString();
	}

	@Retryable(
			retryFor = { Exception.class },
			maxAttempts = 3,
			backoff = @Backoff(delay = 1000, multiplier = 2))
	public String generateDietPlan(Report report, GenerateDietPlanRequestModel request) throws IOException {
		validateSelectedMealTypes(request.getSelectedMealTypes());
		
		StringBuffer sb = new StringBuffer();
		String dietCustomizationsPoint = getDietCustomizationsPoint(request);
		String mealInstructions = buildMealInstructions(request.getSelectedMealTypes());
		String dietPlanExample = buildExampleDietPlan(request.getSelectedMealTypes(), false);

		String sevenDayPrompt = String.format(
				"""
                You are an expert functional nutritionist. Create a personalized diet plan in JSON format based on the provided input details.
        
                Input Details:
                %s
                Blood Markers with Deviations:
                %s
        
                Output Requirements:
                1. Diet Plan:
                Design a 7-day diet plan that's %s. Include only the following meal types:
                %s
        
                Example Diet Plan:
                %s
        
                CRITICAL REQUIREMENTS:
                - Return ONLY valid JSON without any markdown formatting or code blocks
                - Use exact structure shown in example with "diet_plan" array containing day objects
                - Each meal descriptions should be a simple string, not an array or nested object
                - Do not include additional nesting
                - Ensure all recommendations are evidence-based
                - Consider age and gender-specific requirements
                - Account for existing health conditions and lifestyle habits
                - Diet should be culturally appropriate
                %s
                """,
				report.getString(),
				getDeviatedMarkersString(report.getBloodMarkers()),
				getDietTypeString(report.getDiet()),
				mealInstructions,
				dietPlanExample,
				dietCustomizationsPoint
		);

		String singleDayPrompt = String.format(
				"""
                You are an expert functional nutritionist. Create a personalized diet plan in JSON format based on the provided input details.
        
                Input Details:
                %s
                Blood Markers with Deviations:
                %s
        
                Output Requirements:
                1. Diet Plan:
                Design a 1-day diet plan that's %s. Include only the following meal types:
                %s
                
                For each section provide 5 options. Let each option be separated by newline character.
        
                Example Diet Plan:
                %s
        
                CRITICAL REQUIREMENTS:
                - Return ONLY valid JSON without any markdown formatting or code blocks
                - Use exact structure shown in example with "diet_plan" array containing day objects
                - Each meal descriptions should be a simple string, not an array or nested object
                - Do not include additional nesting
                - Ensure all recommendations are evidence-based
                - Consider age and gender-specific requirements
                - Account for existing health conditions and lifestyle habits
                - Diet should be culturally appropriate
                %s
                """,
				report.getString(),
				getDeviatedMarkersString(report.getBloodMarkers()),
				getDietTypeString(report.getDiet()),
				mealInstructions,
				buildExampleDietPlan(request.getSelectedMealTypes(), true),
				dietCustomizationsPoint
		);

		try {
			try (VertexAI vertexAi = new VertexAI.Builder()
					.setProjectId(vertexAiProjectId)
					.setLocation("global")
					.setApiEndpoint(endpoint)
					.build()) {
				GenerationConfig generationConfig = GenerationConfig.newBuilder()
						.setTemperature(0.7F)  // Slightly higher for creative but consistent output
						.setTopP(0.95F)
						.build();

				GenerativeModel model = new GenerativeModel.Builder()
						.setModelName("gemini-2.5-pro")
						.setVertexAi(vertexAi)
						.setGenerationConfig(generationConfig)
						.build();

				var document = PartMaker.fromMimeTypeAndData("text/plain", request.getSingleDayPlan() ? singleDayPrompt.getBytes() : sevenDayPrompt.getBytes());
				var content = ContentMaker.fromMultiModalData(document);
				GenerateContentResponse responseStream = model.generateContent(content);

				responseStream.getCandidatesList()
						.forEach(t -> sb.append(t.getContent().getParts(0).getText()));
			}
		} catch (Exception e) {
			LoggingUtils.logError(logger, "generateSnDPlan attempt failed: {}", e.getMessage());
			throw e;
		}

		return sb.toString();
	}

	private String getDeviatedMarkersString(List<BloodMarker> bloodMarkers) {
		if (bloodMarkers == null || bloodMarkers.isEmpty()) {
			return "No deviated markers found";
		}

		return bloodMarkers.stream()
				.filter(marker -> marker.getResult() != BloodMarkerResultEnum.OPTIMAL)
				.map(marker -> String.format("%s: %s (Deviation: %d%%, %s)",
						marker.getParameterName(),
						marker.getResult().toString(),
						marker.getDeviation(),
						marker.getValue() + " " + marker.getUnits()))
				.collect(Collectors.joining("\n"));
	}

	private String getDietTypeString(DietEnum diet) {
		if (diet == null) {
			return "balanced Indian diet";
		}

		return switch (diet) {
			case VEGETARIAN -> "vegetarian Indian diet";
			case VEGAN -> "vegan Indian diet";
			case EGGITARIAN -> "vegetarian Indian diet with eggs";
			case NON_VEGETARIAN -> "balanced Indian diet with both vegetarian and non-vegetarian options";
			default -> "balanced Indian diet";
		};
	}

	// Add this method to your existing SnDPromptService class

	/**
	 * Enhanced method in SnDPromptService to generate supplement matching prompts
	 */
	@Retryable(
			retryFor = { Exception.class },
			maxAttempts = 3,
			backoff = @Backoff(delay = 1000, multiplier = 2))
	public String matchSupplementNames(List<String> requestedNames, List<String> availableNames) throws IOException {
		StringBuilder sb = new StringBuilder();
		String matchingPrompt = buildSupplementMatchingPrompt(requestedNames, availableNames);

		try {
			try (VertexAI vertexAi = new VertexAI.Builder()
					.setProjectId(vertexAiProjectId)
					.setLocation("global")
					.setApiEndpoint(endpoint)
					.build()) {

				GenerationConfig generationConfig = GenerationConfig.newBuilder()
						.setTemperature(0.1F)  // Low temperature for consistent, factual responses
						.setTopP(0.8F)
						.build();

				GenerativeModel model = new GenerativeModel.Builder()
						.setModelName("gemini-2.5-flash")
						.setVertexAi(vertexAi)
						.setGenerationConfig(generationConfig)
						.build();

				var document = PartMaker.fromMimeTypeAndData("text/plain", matchingPrompt.getBytes());
				var content = ContentMaker.fromMultiModalData(document);
				GenerateContentResponse responseStream = model.generateContent(content);

				responseStream.getCandidatesList()
						.forEach(t -> sb.append(t.getContent().getParts(0).getText()));
			}
		} catch (Exception e) {
			LoggingUtils.logError(logger, "matchSupplementNames attempt failed: {}", e.getMessage());
			throw e;
		}

		return sb.toString();
	}

	private String buildMealInstructions(List<String> selectedMealTypes) {
		if (selectedMealTypes == null || selectedMealTypes.isEmpty()) {
			// Default to all meal types if none selected
			return """
				- Pre-morning: Herbal teas or detox drinks
				- Morning: Balanced breakfast
				- Mid-morning: Healthy snacks
				- Lunch: Wholesome meal
				- Early evening: Light snacks or teas
				- Night: Balanced dinner
				- Bedtime: Relaxing herbal teas""";
		}

		StringBuilder instructions = new StringBuilder();
		for (String mealType : selectedMealTypes) {
			switch (mealType.toLowerCase()) {
				case "pre_morning":
					instructions.append("- Pre-morning: Herbal teas or detox drinks\n");
					break;
				case "morning":
					instructions.append("- Morning: Balanced breakfast\n");
					break;
				case "mid_morning":
					instructions.append("- Mid-morning: Healthy snacks\n");
					break;
				case "lunch":
					instructions.append("- Lunch: Wholesome meal\n");
					break;
				case "early_evening":
					instructions.append("- Early evening: Light snacks or teas\n");
					break;
				case "night":
					instructions.append("- Night: Balanced dinner\n");
					break;
				case "bedtime":
					instructions.append("- Bedtime: Relaxing herbal teas\n");
					break;
			}
		}
		return instructions.toString().trim();
	}

	private String buildExampleDietPlan(List<String> selectedMealTypes, boolean singleDay) {
		if (selectedMealTypes == null || selectedMealTypes.isEmpty()) {
			// Default example with all meal types
			if (singleDay) {
				return """
					{
					  "diet_plan": [
					    {
					      "day": 1,
					      "pre_morning": "Warm coriander water with lemon\\nCumin and coriander infused water",
					      "morning": "Vegetable poha with coconut chutney, herbal tulsi tea\\nVegetable upma with yogurt,  herbal tea",
					      "mid_morning": "Handful of soaked almonds and walnuts\\nIdli (steamed rice cakes) with sambar and coconut chutney",
					      "lunch": "Brown rice, moong dal, mixed vegetable sabzi, cucumber salad\\nQuinoa, chana masala (chickpea curry), spinach salad",
					      "early_evening": "Homemade peanut chaat, hibiscus tea\\nA small bowl of roasted chana (chickpeas)",
					      "night": "Bajra roti, palak paneer, pumpkin sabzi, carrot salad\\nRagi roti (finger millet flatbread), vegetable stew, cucumber salad",
					      "bedtime": "Chamomile tea with a pinch of nutmeg\\nAshwagandha tea"
					    }
					  ]
					}""";
			} else {
				return """
					{
					  "diet_plan": [
					    {
					      "day": 1,
					      "pre_morning": "Warm coriander water with lemon",
					      "morning": "Vegetable poha with coconut chutney, herbal tulsi tea",
					      "mid_morning": "Handful of soaked almonds and walnuts",
					      "lunch": "Brown rice, moong dal, mixed vegetable sabzi, cucumber salad",
					      "early_evening": "Homemade peanut chaat, hibiscus tea",
					      "night": "Bajra roti, palak paneer, pumpkin sabzi, carrot salad",
					      "bedtime": "Chamomile tea with a pinch of nutmeg"
					    }
					  ]
					}""";
			}
		}

		// Build example with only selected meal types
		StringBuilder example = new StringBuilder();
		example.append("{\n  \"diet_plan\": [\n    {\n      \"day\": 1");

		for (String mealType : selectedMealTypes) {
			switch (mealType.toLowerCase()) {
				case "pre_morning":
					if (singleDay) {
						example.append(",\n      \"pre_morning\": \"Warm coriander water with lemon\\nCumin and coriander infused water\"");
					} else {
						example.append(",\n      \"pre_morning\": \"Warm coriander water with lemon\"");
					}
					break;
				case "morning":
					if (singleDay) {
						example.append(",\n      \"morning\": \"Vegetable poha with coconut chutney, herbal tulsi tea\\nVegetable upma with yogurt, herbal tea\"");
					} else {
						example.append(",\n      \"morning\": \"Vegetable poha with coconut chutney, herbal tulsi tea\"");
					}
					break;
				case "mid_morning":
					if (singleDay) {
						example.append(",\n      \"mid_morning\": \"Handful of soaked almonds and walnuts\\nIdli (steamed rice cakes) with sambar and coconut chutney\"");
					} else {
						example.append(",\n      \"mid_morning\": \"Handful of soaked almonds and walnuts\"");
					}
					break;
				case "lunch":
					if (singleDay) {
						example.append(",\n      \"lunch\": \"Brown rice, moong dal, mixed vegetable sabzi, cucumber salad\\nQuinoa, chana masala (chickpea curry), spinach salad\"");
					} else {
						example.append(",\n      \"lunch\": \"Brown rice, moong dal, mixed vegetable sabzi, cucumber salad\"");
					}
					break;
				case "early_evening":
					if (singleDay) {
						example.append(",\n      \"early_evening\": \"Homemade peanut chaat, hibiscus tea\\nA small bowl of roasted chana (chickpeas)\"");
					} else {
						example.append(",\n      \"early_evening\": \"Homemade peanut chaat, hibiscus tea\"");
					}
					break;
				case "night":
					if (singleDay) {
						example.append(",\n      \"night\": \"Bajra roti, palak paneer, pumpkin sabzi, carrot salad\\nRagi roti (finger millet flatbread), vegetable stew, cucumber salad\"");
					} else {
						example.append(",\n      \"night\": \"Bajra roti, palak paneer, pumpkin sabzi, carrot salad\"");
					}
					break;
				case "bedtime":
					if (singleDay) {
						example.append(",\n      \"bedtime\": \"Chamomile tea with a pinch of nutmeg\\nAshwagandha tea\"");
					} else {
						example.append(",\n      \"bedtime\": \"Chamomile tea with a pinch of nutmeg\"");
					}
					break;
			}
		}

		example.append("\n    }\n  ]\n}");
		return example.toString();
	}

	private String buildSupplementMatchingPrompt(List<String> requestedNames, List<String> availableNames) {
		StringBuilder prompt = new StringBuilder();
		prompt.append("You are a nutrition and supplement expert. Your task is to match requested supplement names with available supplement names from a user's database.\n\n");

		prompt.append("CRITICAL MATCHING RULES:\n");
		prompt.append("1. Only match supplements that are scientifically the SAME substance or compound\n");
		prompt.append("2. Consider these equivalent matches:\n");
		prompt.append("   - Vitamin D3 = Cholecalciferol = Vitamin D-3\n");
		prompt.append("   - Vitamin B12 = Cobalamin = Cyanocobalamin = Methylcobalamin\n");
		prompt.append("   - Omega-3 = Fish Oil = EPA/DHA = Omega 3 Fatty Acids\n");
		prompt.append("   - Magnesium = Magnesium Glycinate = Magnesium Oxide = Magnesium Citrate\n");
		prompt.append("   - Probiotics = Probiotic Blend = Multi-strain Probiotics\n");
		prompt.append("   - Multivitamin = Multi-vitamin = Daily Multivitamin\n");
		prompt.append("3. DO NOT match different substances even if they're related (e.g., Calcium ≠ Vitamin D)\n");
		prompt.append("4. Ignore case differences, spacing, hyphens, and minor spelling variations\n");
		prompt.append("5. Only return matches you are highly confident about (scientific certainty)\n");
		prompt.append("6. If uncertain, do not include the match\n\n");

		prompt.append("REQUESTED SUPPLEMENT NAMES:\n");
		for (int i = 0; i < requestedNames.size(); i++) {
			prompt.append((i + 1)).append(". ").append(requestedNames.get(i)).append("\n");
		}

		prompt.append("\nAVAILABLE SUPPLEMENT NAMES IN USER'S DATABASE:\n");
		for (int i = 0; i < availableNames.size(); i++) {
			prompt.append((i + 1)).append(". ").append(availableNames.get(i)).append("\n");
		}

		prompt.append("\nRESPONSE FORMAT:\n");
		prompt.append("Return ONLY a JSON object in this exact format:\n");
		prompt.append("{\n");
		prompt.append("  \"matches\": [\n");
		prompt.append("    {\n");
		prompt.append("      \"requested\": \"exact requested supplement name\",\n");
		prompt.append("      \"matched\": \"exact matched supplement name from database\",\n");
		prompt.append("      \"confidence\": \"high\",\n");
		prompt.append("      \"reason\": \"brief explanation of why they match\"\n");
		prompt.append("    }\n");
		prompt.append("  ]\n");
		prompt.append("}\n\n");
		prompt.append("IMPORTANT: Only include matches with 'high' confidence. If no high-confidence matches exist, return empty matches array.");

		return prompt.toString();
	}

	@Retryable(
			retryFor = { Exception.class },
			maxAttempts = 3,
			backoff = @Backoff(delay = 1000, multiplier = 2))
	public String generateDietPlanFromConfig(Report report, NewDietPlanRequestModel request) throws IOException {
		StringBuffer sb = new StringBuffer();

		// Build diet configuration context from stepper selections
		StringBuilder dietConfigContext = new StringBuilder();
		dietConfigContext.append("Diet Configuration Selected by Practitioner:\n");
		dietConfigContext.append(String.format("- Primary Diet: %s\n", request.getPrimaryDiet()));

		if (request.getSupportDiets() != null && !request.getSupportDiets().isEmpty()) {
			dietConfigContext.append(String.format("- Support Diets: %s\n", String.join(", ", request.getSupportDiets())));
		}
		if (request.getModifiers() != null && !request.getModifiers().isEmpty()) {
			dietConfigContext.append(String.format("- Therapeutic Modifiers: %s\n", String.join(", ", request.getModifiers())));
		}
		if (request.getClinicalConditions() != null && !request.getClinicalConditions().isEmpty()) {
			dietConfigContext.append(String.format("- Clinical Conditions: %s\n", String.join(", ", request.getClinicalConditions())));
		}

		// Preferences
		if (request.getDietType() != null) {
			dietConfigContext.append(String.format("- Diet Type: %s\n", request.getDietType()));
		}
		if (request.getCuisine() != null) {
			dietConfigContext.append(String.format("- Cuisine Preference: %s\n", request.getCuisine()));
		}
		if (request.getMealFrequency() != null) {
			dietConfigContext.append(String.format("- Meal Frequency: %s\n", request.getMealFrequency()));
		}
		if (request.getCalorieStrategy() != null) {
			dietConfigContext.append(String.format("- Calorie Strategy: %s\n", request.getCalorieStrategy()));
		}
		if (request.getProteinTarget() != null) {
			dietConfigContext.append(String.format("- Protein Target: %s\n", request.getProteinTarget()));
		}

		// Determine number of meals from mealFrequency
		String mealCount = "4";
		if (request.getMealFrequency() != null) {
			if (request.getMealFrequency().contains("3")) mealCount = "3";
			else if (request.getMealFrequency().contains("5")) mealCount = "5";
		}

		// Determine diet type string for the prompt
		String dietTypeStr;
		if (request.getDietType() != null) {
			switch (request.getDietType().toLowerCase()) {
				case "vegetarian" -> dietTypeStr = "vegetarian Indian diet";
				case "eggetarian" -> dietTypeStr = "vegetarian Indian diet with eggs";
				case "non-vegetarian" -> dietTypeStr = "balanced Indian diet with both vegetarian and non-vegetarian options";
				default -> dietTypeStr = getDietTypeString(report.getDiet());
			}
		} else {
			dietTypeStr = getDietTypeString(report.getDiet());
		}

		String prompt = String.format(
				"""
				You are an expert functional nutritionist. Create a personalized diet plan in JSON format based on the provided input details and diet configuration.

				Client Details:
				%s

				Blood Markers with Deviations:
				%s

				%s

				Output Requirements:
				Design a 7-day diet plan that is %s.
				The plan should follow the primary diet approach: %s.
				The plan should have %s meals per day.

				Include the following meal types:
				- Pre-morning: Herbal teas or detox drinks
				- Morning: Balanced breakfast
				- Mid-morning: Healthy snacks
				- Lunch: Wholesome meal
				- Early evening: Light snacks or teas
				- Night: Balanced dinner
				- Bedtime: Relaxing herbal teas

				Example Diet Plan:
				{
				  "diet_plan": [
				    {
				      "day": 1,
				      "pre_morning": "Warm coriander water with lemon",
				      "morning": "Vegetable poha with coconut chutney, herbal tulsi tea",
				      "mid_morning": "Handful of soaked almonds and walnuts",
				      "lunch": "Brown rice, moong dal, mixed vegetable sabzi, cucumber salad",
				      "early_evening": "Homemade peanut chaat, hibiscus tea",
				      "night": "Bajra roti, palak paneer, pumpkin sabzi, carrot salad",
				      "bedtime": "Chamomile tea with a pinch of nutmeg"
				    }
				  ]
				}

				CRITICAL REQUIREMENTS:
				- Return ONLY valid JSON without any markdown formatting or code blocks
				- Use exact structure shown in example with "diet_plan" array containing day objects
				- Each meal description should be a simple string, not an array or nested object
				- Do not include additional nesting
				- Ensure all recommendations are evidence-based
				- Consider age and gender-specific requirements
				- Account for existing health conditions and lifestyle habits
				- Diet should be culturally appropriate for the specified cuisine preference
				- Strictly follow the therapeutic modifiers and clinical conditions specified
				""",
				report.getString(),
				getDeviatedMarkersString(report.getBloodMarkers()),
				dietConfigContext.toString(),
				dietTypeStr,
				request.getPrimaryDiet(),
				mealCount
		);

		try {
			try (VertexAI vertexAi = new VertexAI.Builder()
					.setProjectId(vertexAiProjectId)
					.setLocation("global")
					.setApiEndpoint(endpoint)
					.build()) {
				GenerationConfig generationConfig = GenerationConfig.newBuilder()
						.setTemperature(0.7F)
						.setTopP(0.95F)
						.build();

				GenerativeModel model = new GenerativeModel.Builder()
						.setModelName("gemini-2.5-pro")
						.setVertexAi(vertexAi)
						.setGenerationConfig(generationConfig)
						.build();

				var document = PartMaker.fromMimeTypeAndData("text/plain", prompt.getBytes());
				var content = ContentMaker.fromMultiModalData(document);
				GenerateContentResponse responseStream = model.generateContent(content);

				responseStream.getCandidatesList()
						.forEach(t -> sb.append(t.getContent().getParts(0).getText()));
			}
		} catch (Exception e) {
			LoggingUtils.logError(logger, "generateDietPlanFromConfig attempt failed: {}", e.getMessage());
			throw e;
		}

		return sb.toString();
	}

}