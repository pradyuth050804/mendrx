package com.mendrx.backend.controller;

import com.mendrx.backend.exception.LifestyleRecNotFoundException;
// Removed Item/Panel exceptions
import com.mendrx.backend.model.*;
import com.mendrx.backend.model.request.GenerateLifestyleRecRequestModel;
// Removed: LifestyleRecItemRequestModel
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.LifestyleRecResponseModel;
import com.mendrx.backend.service.*;
// Removed: @Valid import if not used elsewhere
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/lifestyle-rec")
public class LifestyleRecController {
    private static final Logger logger = LoggerFactory.getLogger(LifestyleRecController.class);

    private static final int CREDITS_PER_LIFESTYLE_REC_PLAN = 100; // Keep if generation costs credits

    @Autowired
    private JwtValidatorService jwtValidatorService;
    @Autowired
    private LifestyleRecService lifestyleRecService;
    @Autowired
    private UserService userService;
    @Autowired
    private ReportService reportService; // Keep for generation
    @Autowired
    private SlackNotificationService slackNotificationService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<LifestyleRecResponseModel>> generateLifestyleRecommendations(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody GenerateLifestyleRecRequestModel request) { // Keep existing request model for generation trigger

        LoggingUtils.logInfo(logger, "/lifestyle-rec/generate API invoked for report ID: {}", request.getReportId()); // Log report ID

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid or expired token for lifestyle recommendation generation");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for lifestyle recommendation generation");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            } else if (user.getCredits() < CREDITS_PER_LIFESTYLE_REC_PLAN) {
                LoggingUtils.logWarn(logger, "Insufficient credits for user: {}. Required: {}, Available: {}", user.getId(), CREDITS_PER_LIFESTYLE_REC_PLAN, user.getCredits());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST) // Changed to BAD_REQUEST from NOT_FOUND
                        .body(new ApiResponse<>("INSUFFICIENT_CREDITS",
                                String.format("Insufficient credits. %d credits are required per plan", CREDITS_PER_LIFESTYLE_REC_PLAN)));
            } else if (user.getSubscriptionExpiry().isBefore(LocalDateTime.now())) {
                LoggingUtils.logWarn(logger, "Subscription expired for user: {}", user.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN) // Changed to FORBIDDEN
                        .body(new ApiResponse<>("SUBSCRIPTION_EXPIRED", "Subscription expired. Please renew your subscription"));
            }

            // Fetch report using reportId from request model
            boolean reportExists = reportService.getReportExists(request.getReportId()); // Assuming method exists

            // Basic check if report belongs to the user requesting generation
            if (!reportExists) {
                LoggingUtils.logWarn(logger, "Report not found or access denied for report ID: {}", request.getReportId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found or access denied"));
            }


            LoggingUtils.logInfo(logger, "Starting lifestyle recommendations generation for report ID: {}", request.getReportId());
            LifestyleRecommendations lifestyleRecommendations = lifestyleRecService.generateLifestyleRecommendations(request.getReportId(), request.getPoorPanels());
            user = userService.deductCredits(user, CREDITS_PER_LIFESTYLE_REC_PLAN);
            LoggingUtils.logInfo(logger, "Successfully generated lifestyle recommendations for report ID: {}, Credits deducted: {}", request.getReportId(), CREDITS_PER_LIFESTYLE_REC_PLAN);

            // Assuming LifestyleRecResponseModel primarily holds the LifestyleRecommendations object
            // and credits info. It should work as long as LifestyleRecommendations serialization is correct.
            LifestyleRecResponseModel responseModel = new LifestyleRecResponseModel();
            responseModel.setLifestyleRecommendations(lifestyleRecommendations); // This now contains recommendationData
            responseModel.setConsumedCredits(CREDITS_PER_LIFESTYLE_REC_PLAN);
            responseModel.setUpdatedCredits(user.getCredits());

            return ResponseEntity.ok(new ApiResponse<>(responseModel));

        } catch (IllegalArgumentException e) {
            // Catch specific exceptions thrown by the service or validation
            if (e.getMessage() != null && e.getMessage().contains("Report is missing necessary user or parent information")) {
                LoggingUtils.logWarn(logger, "Invalid request data for lifestyle recommendation generation: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_REQUEST_DATA", e.getMessage()));
            }
            if (e.getMessage() != null && e.getMessage().contains("Could not find any lifestyle recommendation template data")) {
                LoggingUtils.logWarn(logger, "Template error during lifestyle recommendation generation: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST) // Or NOT_FOUND depending on semantics
                        .body(new ApiResponse<>("TEMPLATE_ERROR", e.getMessage()));
            }
            if (e.getMessage() != null && e.getMessage().contains("Could not generate lifestyle recommendation JSON data")) {
                LoggingUtils.logError(logger, "Template JSON error during lifestyle recommendation generation: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ApiResponse<>("TEMPLATE_JSON_ERROR", e.getMessage()));
            }
            // Handle invalid UUID format specifically if needed, otherwise catch generic IllegalArgumentException
            if (e.getMessage() != null && e.getMessage().contains("Invalid UUID string")) {
                LoggingUtils.logWarn(logger, "Invalid report ID format for lifestyle recommendation generation: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
            }
            LoggingUtils.logWarn(logger, "Invalid argument for lifestyle recommendation generation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_ARGUMENT", e.getMessage()));
        } catch (IllegalStateException e) {
            // Catch case where recommendations already exist
            LoggingUtils.logWarn(logger, "Lifestyle recommendations already exist: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT) // Use 409 Conflict
                    .body(new ApiResponse<>("ALREADY_EXISTS", e.getMessage()));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Unexpected error during lifestyle recommendation generation: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/lifestyle-rec/generate", "Unexpected error during lifestyle recommendations generation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("GENERATION_ERROR", "Error generating lifestyle recommendations : " + e.getMessage()));
        }
    }

    /**
     * Retrieves the lifestyle recommendations associated with a specific report ID.
     */
    @GetMapping("/report/{reportId}") // Changed path and path variable
    public ResponseEntity<ApiResponse<LifestyleRecResponseModel>> getLifestyleRecommendationsByReportId(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID reportId) { // Use reportId

        LoggingUtils.logInfo(logger, "GET /lifestyle-rec/report/{} API invoked", reportId); // Updated log message

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid token for lifestyle recommendations fetch by report ID: {}", reportId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for lifestyle recommendations fetch by report ID: {}", reportId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            // Fetch by report ID using the existing service method
            LoggingUtils.logInfo(logger, "Fetching lifestyle recommendations for report ID: {}", reportId);
            LifestyleRecommendations lifestyleRecommendations = lifestyleRecService.getLifestyleRecommendations(reportId);
            LoggingUtils.logInfo(logger, "Successfully fetched lifestyle recommendations for report ID: {}", reportId);


            // Assuming LifestyleRecResponseModel mainly wraps LifestyleRecommendations
            LifestyleRecResponseModel responseModel = new LifestyleRecResponseModel();
            responseModel.setLifestyleRecommendations(lifestyleRecommendations); // Contains recommendationData

            return ResponseEntity.ok(new ApiResponse<>(responseModel));

        } catch (LifestyleRecNotFoundException e) {
            // This catches both "not found for reportId" and unauthorized access (as we throw the same exception above)
            LoggingUtils.logWarn(logger, "Lifestyle recommendations not found for report ID: {}", reportId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("PLAN_NOT_FOUND", "Lifestyle recommendations not found for the specified report or access denied."));
        } catch (IllegalArgumentException e) { // e.g., invalid UUID format for reportId
            LoggingUtils.logWarn(logger, "Invalid report ID format: {}", reportId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Unexpected error fetching lifestyle recommendations for report {}: {}", reportId, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/lifestyle-rec/report/{reportId}", "Failed to fetch lifestyle recommendations for report: " + reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error fetching lifestyle recommendations: " + e.getMessage()));
        }
    }

    /**
     * Updates the entire lifestyle recommendation structure for a given recommendation ID.
     * Expects the complete JSON representation of the recommendations in the request body.
     * NOTE: This endpoint still uses recommendationId, which the frontend should get
     * from the initial fetch via /report/{reportId}.
     */
    @PutMapping("/{recommendationId}")
    public ResponseEntity<ApiResponse<LifestyleRecResponseModel>> updateLifestyleRecommendations(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID recommendationId, // Keep using recommendationId for updates
            @RequestBody String jsonData) { // Receive the raw JSON string

        LoggingUtils.logInfo(logger, "PUT /lifestyle-rec/{} API invoked", recommendationId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid token for lifestyle recommendations update: {}", recommendationId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse<>("UNAUTHORIZED", "Invalid token"));
        }

        if (jsonData == null || jsonData.trim().isEmpty()) {
            LoggingUtils.logWarn(logger, "Empty request body for lifestyle recommendations update: {}", recommendationId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiResponse<>("INVALID_REQUEST_BODY", "Request body cannot be empty."));
        }


        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for lifestyle recommendations update: {}", recommendationId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            // Service method still uses recommendationId for updates
            LoggingUtils.logInfo(logger, "Updating lifestyle recommendations for recommendation ID: {}", recommendationId);
            LifestyleRecommendations updatedRecommendations = lifestyleRecService.updateLifestyleRecommendations(recommendationId, jsonData, user.getId());
            LoggingUtils.logInfo(logger, "Successfully updated lifestyle recommendations for recommendation ID: {}", recommendationId);

            // Return the updated recommendations
            LifestyleRecResponseModel responseModel = new LifestyleRecResponseModel();
            responseModel.setLifestyleRecommendations(updatedRecommendations);

            return ResponseEntity.ok(new ApiResponse<>(responseModel, "Recommendations updated successfully"));

        } catch (LifestyleRecNotFoundException e) {
            LoggingUtils.logWarn(logger, "Cannot update recommendations {}: {}", recommendationId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse<>("RESOURCE_NOT_FOUND", "Recommendation with the specified ID not found."));
        } catch (SecurityException e) {
            LoggingUtils.logWarn(logger, "Authorization failed for updating recommendations {}: {}", recommendationId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse<>("ACCESS_DENIED", e.getMessage()));
        } catch (IllegalArgumentException e) { // Catch potential issues from service layer if any
            LoggingUtils.logWarn(logger, "Invalid argument for lifestyle recommendations update {}: {}", recommendationId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiResponse<>("UPDATE_FAILED", e.getMessage()));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error updating recommendations {}: {}", recommendationId, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/lifestyle-rec/{recommendationId}", "Failed to update lifestyle recommendations for ID: " + recommendationId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiResponse<>("UPDATE_ERROR", "Failed to update recommendations."));
        }
    }

}