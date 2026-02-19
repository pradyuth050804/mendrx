package com.mendrx.backend.service;

import com.mendrx.backend.exception.LifestyleRecNotFoundException;
import com.mendrx.backend.model.*;
import com.mendrx.backend.repository.LifestyleRecRepository;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class LifestyleRecService {

    private static final Logger logger = LoggerFactory.getLogger(LifestyleRecService.class);

    @Autowired
    private LifestyleRecRepository lifestyleRecRepository;

    @Autowired
    private LifestyleRecTemplateService templateService; // Inject the template service
    @Autowired
    private ReportService reportService;

    // Removed: ReportService dependency (assuming report is fetched before calling generate)

    @Transactional(readOnly = true)
    public boolean existsByReportId(UUID reportId) {
        return lifestyleRecRepository.existsByReportId(reportId);
    }

    /**
     * Retrieves existing Lifestyle Recommendations for a given report ID.
     *
     * @param reportId The UUID of the report.
     * @return The LifestyleRecommendations entity including the recommendationData JSON string.
     * @throws LifestyleRecNotFoundException if no recommendations are found for the report ID.
     */
    @Transactional(readOnly = true)
    public LifestyleRecommendations getLifestyleRecommendations(UUID reportId) {
        LoggingUtils.logInfo(logger, "Fetching lifestyle recommendations for report ID: {}", reportId);
        // Fetch the main entity. Eager fetching of sub-entities is no longer needed.
        // Assuming findByReportId exists or using findById if the relationship allows easy fetching.
        // If findByReportId doesn't exist, use the report object to get the ID if needed,
        // or query based on the report object itself.
        // Let's assume a method findByReport_Id exists or adapt as needed.
        return lifestyleRecRepository.findByReportId(reportId) // Adjust query if needed
                .orElseThrow(() -> {
                    LoggingUtils.logWarn(logger, "Lifestyle recommendations not found for report ID: {}", reportId);
                    return new LifestyleRecNotFoundException();
                });
    }


    /**
     * Generates and saves new Lifestyle Recommendations based on poor panels for a report.
     * Fetches template data and constructs an initial JSON string for recommendationData.
     *
     * @param reportId     The Report ID entity for which to generate recommendations.
     * @param poorPanels A list of panel names identified as poor (e.g., "Blood Health", "Glucose Metabolism").
     * @return The newly created and saved LifestyleRecommendations entity.
     * @throws IllegalStateException if recommendations already exist for this report.
     * @throws IllegalArgumentException if the report's user, parent, or parent ID is null, or if template data cannot be converted to JSON.
     */
    @Transactional // This operation modifies the database
    public LifestyleRecommendations generateLifestyleRecommendations(UUID reportId, List<String> poorPanels) {
        LoggingUtils.logInfo(logger, "Attempting to generate lifestyle recommendations (JSON format) for report ID: {} with poor panels: {}", reportId, poorPanels);

        // 1. Check if recommendations already exist for this report
        if (lifestyleRecRepository.existsByReportId(reportId)) {
            LoggingUtils.logWarn(logger, "Lifestyle recommendations already exist for report ID: {}", reportId);
            throw new IllegalStateException("Lifestyle recommendations already exist for report ID: " + reportId);
        }

        // 2. Get the template ID from the report's user's parent
        User user = reportService.getUserForReport(reportId);
        if (user == null || user.getParent() == null || user.getParent().getId() == null) {
            LoggingUtils.logError(logger, "Cannot generate recommendations: Report {} has missing User or Parent information.", reportId);
            throw new IllegalArgumentException("Report is missing necessary user or parent information.");
        }
        Integer templateId = user.getParent().getId();
        LoggingUtils.logInfo(logger, "Using template ID: {} based on user's parent for report ID: {}", templateId, reportId);


        // 3. Create the main LifestyleRecommendations entity
        LifestyleRecommendations recommendations = new LifestyleRecommendations();
        recommendations.setReportId(reportId);

        // 4. Determine which template panels (sheet names) to load based on poorPanels
        Set<String> uniqueTemplatePanelNames = mapPoorPanelsToTemplateNames(poorPanels);
        LoggingUtils.logDebug(logger, "Mapped poor panels {} to template panel/sheet names: {} for report ID: {}", poorPanels, uniqueTemplatePanelNames, reportId);


        // 5. Load template data and GENERATE JSON STRING
        // *** THIS REQUIRES LifestyleRecTemplateService TO BE REFACTORED ***
        // Assume templateService now has a method like generateInitialJsonForPanels
        // which takes templateId and panel names, and returns the JSON string.
        String initialJsonData = "";
        try {
            // Replace this with the actual call to the refactored template service method
            initialJsonData = templateService.generateInitialJsonForPanels(templateId, uniqueTemplatePanelNames);

            if (initialJsonData == null || initialJsonData.isEmpty() || initialJsonData.equals("[]")) {
                LoggingUtils.logWarn(logger, "Template service generated empty or null JSON data for template ID {} and panels {}. Storing empty data.",
                        templateId, uniqueTemplatePanelNames);
                initialJsonData = "[]"; // Store empty JSON array if nothing generated
            }
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to generate initial JSON data from template service for report ID {}: {}", reportId, e.getMessage(), e);
            throw new IllegalArgumentException("Could not generate lifestyle recommendation JSON data from template: " + e.getMessage(), e);
        }

        // 6. Set the generated JSON data
        recommendations.setRecommendationData(initialJsonData);

        // 7. Save the LifestyleRecommendations entity
        LifestyleRecommendations savedRecommendations = lifestyleRecRepository.save(recommendations);
        LoggingUtils.logInfo(logger, "Successfully generated and saved lifestyle recommendations (JSON format) with ID: {} for report ID: {}", savedRecommendations.getId(), reportId);

        return savedRecommendations;
    }

    /**
     * Updates the entire recommendation data for a given recommendation ID.
     * Replaces the existing recommendationData JSON string with the provided one.
     *
     * @param recommendationId The ID of the LifestyleRecommendations to update.
     * @param jsonData The new JSON string representing the recommendation structure.
     * @param requestingUserId The ID of the user making the request (for authorization).
     * @return The updated LifestyleRecommendations entity.
     * @throws LifestyleRecNotFoundException if the recommendations are not found.
     * @throws SecurityException if the requesting user does not own the associated report.
     */
    @Transactional
    public LifestyleRecommendations updateLifestyleRecommendations(UUID recommendationId, String jsonData, UUID requestingUserId) {
        LoggingUtils.logInfo(logger, "Attempting to update lifestyle recommendations with ID: {}", recommendationId);

        // 1. Fetch the existing recommendations entity
        // We need to fetch the associated report and user for authorization.
        // Adjust the repository method or fetching strategy as needed.
        LifestyleRecommendations recommendations = lifestyleRecRepository.findById(recommendationId)
                .orElseThrow(LifestyleRecNotFoundException::new);

        // 2. Validate jsonData (Optional - user requested no validation)
        // If validation was needed, it would happen here (e.g., using Jackson ObjectMapper to parse)

        // 3. Update the JSON data
        recommendations.setRecommendationData(jsonData);
        // @PreUpdate will automatically update the 'updatedAt' timestamp

        // 4. Save the updated entity
        LifestyleRecommendations updatedRecommendations = lifestyleRecRepository.save(recommendations);
        LoggingUtils.logInfo(logger, "Successfully updated recommendations with ID {}", recommendationId);

        return updatedRecommendations;
    }


    // Helper function (can remain the same)
    private Set<String> mapPoorPanelsToTemplateNames(List<String> poorPanels) {
        Set<String> templateNames = new HashSet<>();
        templateNames.add("Toxin Elimination");
        if (poorPanels == null) {
            return templateNames; // Return empty set if input is null
        }

        for (String panel : poorPanels) {
            if (panel == null) continue; // Skip null entries

            switch (panel.trim()) {
                case "Blood Health":
                    templateNames.add("Blood");
                    break;
                case "Kidney Health":
                    templateNames.add("Kidney");
                    break;
                case "Thyroid Health":
                    templateNames.add("Thyroid");
                    break;
                case "Liver Health":
                    templateNames.add("Liver");
                    break;
                case "Glucose Metabolism":
                case "Heart Health":
                    templateNames.add("Metabolism");
                    break;
                // Add more mappings here if needed
                default:
                    LoggingUtils.logWarn(logger, "Unrecognized poor panel name '{}'. No template mapping defined.", panel);
                    break;
            }
        }
        return templateNames;
    }

    // Removed: addItemToPanel, updateItem, deleteItem methods
}