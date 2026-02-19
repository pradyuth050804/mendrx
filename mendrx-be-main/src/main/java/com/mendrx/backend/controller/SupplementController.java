package com.mendrx.backend.controller;

import com.mendrx.backend.exception.DuplicateSupplementException;
import com.mendrx.backend.exception.SupplementBrandGuidelineNotFoundException;
import com.mendrx.backend.model.SnDPlan;
import com.mendrx.backend.model.SupplementBrandGuideline;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.request.*;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.SupplementBrandSuggestionResponseModel;
import com.mendrx.backend.service.*;
import com.mendrx.backend.util.LoggingUtils;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/supplements")
public class SupplementController {

    private static final Logger logger = LoggerFactory.getLogger(SupplementController.class);

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private UserService userService;

    @Autowired
    private SupplementBrandGuidelineService supplementBrandGuidelineService;

    @Autowired
    private SupplementAutoPopulateService supplementAutoPopulateService;

    @Autowired
    private SlackNotificationService slackNotificationService;

    @Autowired
    private SnDPlanService snDPlanService;

    @PostMapping("/auto-populate/{reportId}")
    public ResponseEntity<ApiResponse<SnDPlan>> autoPopulateSupplements(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reportId) {

        LoggingUtils.logInfo(logger, "/supplements/auto-populate API invoked with Report ID: {}",
                reportId);

        // Extract and validate the JWT token
        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid or expired token for supplement auto-populate");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            // Retrieve the authenticated user
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for supplement auto-populate");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            // Ensure the request includes a plan ID
            UUID reportUuid = UUID.fromString(reportId);
            SnDPlan snDPlan = snDPlanService.getSnDPlan(reportUuid);
            SnDPlan newSnDPlan = supplementAutoPopulateService.autoPopulateBrandSuggestions(user, snDPlan);

            LoggingUtils.logInfo(logger, "Successfully auto-populated brand suggestions for report id: {}",
                    reportId);
            return ResponseEntity.ok(new ApiResponse<>(newSnDPlan));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error auto-populating supplements: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/supplements/auto-populate",
                    "Failed to auto-populate supplements", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("AUTO_POPULATE_ERROR",
                            "Error auto-populating supplements: " + e.getMessage()));
        }
    }

    /**
     * Get all supplement brand guidelines for the authenticated user
     */
    @GetMapping("/manage")
    public ResponseEntity<ApiResponse<List<SupplementBrandGuideline>>> getAllSupplements(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/supplements/manage API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for supplement management");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            List<SupplementBrandGuideline> supplements = supplementBrandGuidelineService.getAllSupplementsForUser(user);

            LoggingUtils.logInfo(logger, "Successfully retrieved {} supplement brand guidelines for user: {}",
                    supplements.size(), user.getId());

            return ResponseEntity.ok(new ApiResponse<>(supplements));

        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error retrieving supplement brand guidelines: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/supplements/manage",
                    "Failed to retrieve supplement brand guidelines", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("RETRIEVAL_ERROR", "Error retrieving supplements: " + e.getMessage()));
        }
    }

    /**
     * Get a specific supplement brand guideline by ID
     */
    @GetMapping("/manage/{id}")
    public ResponseEntity<ApiResponse<SupplementBrandGuideline>> getSupplementById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {

        LoggingUtils.logInfo(logger, "/supplements/manage/{} API invoked", id);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for supplement retrieval");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            SupplementBrandGuideline supplement = supplementBrandGuidelineService.getSupplementById(id, user);

            LoggingUtils.logInfo(logger, "Successfully retrieved supplement brand guideline with ID: {} for user: {}",
                    id, user.getId());

            return ResponseEntity.ok(new ApiResponse<>(supplement));

        } catch (SupplementBrandGuidelineNotFoundException e) {
            LoggingUtils.logWarn(logger, "Supplement brand guideline not found with ID: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("SUPPLEMENT_NOT_FOUND", "Supplement brand guideline not found"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error retrieving supplement brand guideline with ID {}: {}", id, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/supplements/manage/{id}",
                    "Failed to retrieve supplement brand guideline: " + id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("RETRIEVAL_ERROR", "Error retrieving supplement: " + e.getMessage()));
        }
    }

    /**
     * Create a new supplement brand guideline
     */
    @PostMapping("/manage")
    public ResponseEntity<ApiResponse<SupplementBrandGuideline>> createSupplement(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody CreateSupplementBrandGuidelineRequestModel request) {

        LoggingUtils.logInfo(logger, "/supplements/manage POST API invoked for supplement: {}", request.getSupplementName());

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for supplement creation");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            SupplementBrandGuideline supplement = supplementBrandGuidelineService.createSupplement(user, request);

            LoggingUtils.logInfo(logger, "Successfully created supplement brand guideline with ID: {} for user: {}",
                    supplement.getId(), user.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>(supplement));

        } catch (DuplicateSupplementException e) {
            LoggingUtils.logWarn(logger, "Duplicate supplement name '{}' for user", request.getSupplementName());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse<>("DUPLICATE_SUPPLEMENT", e.getMessage()));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error creating supplement brand guideline: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/supplements/manage POST",
                    "Failed to create supplement brand guideline", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("CREATION_ERROR", "Error creating supplement: " + e.getMessage()));
        }
    }

    /**
     * Update an existing supplement brand guideline
     */
    @PutMapping("/manage/{id}")
    public ResponseEntity<ApiResponse<SupplementBrandGuideline>> updateSupplement(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSupplementBrandGuidelineRequestModel request) {

        LoggingUtils.logInfo(logger, "/supplements/manage/{} PUT API invoked", id);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for supplement update");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            SupplementBrandGuideline supplement = supplementBrandGuidelineService.updateSupplement(id, user, request);

            LoggingUtils.logInfo(logger, "Successfully updated supplement brand guideline with ID: {} for user: {}",
                    id, user.getId());

            return ResponseEntity.ok(new ApiResponse<>(supplement));

        } catch (SupplementBrandGuidelineNotFoundException e) {
            LoggingUtils.logWarn(logger, "Supplement brand guideline not found with ID: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("SUPPLEMENT_NOT_FOUND", "Supplement brand guideline not found"));
        } catch (DuplicateSupplementException e) {
            LoggingUtils.logWarn(logger, "Duplicate supplement name '{}' for user", request.getSupplementName());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse<>("DUPLICATE_SUPPLEMENT", e.getMessage()));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error updating supplement brand guideline with ID {}: {}", id, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/supplements/manage/{id} PUT",
                    "Failed to update supplement brand guideline: " + id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPDATE_ERROR", "Error updating supplement: " + e.getMessage()));
        }
    }

    /**
     * Delete a supplement brand guideline
     */
    @DeleteMapping("/manage/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplement(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {

        LoggingUtils.logInfo(logger, "/supplements/manage/{} DELETE API invoked", id);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for supplement deletion");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            supplementBrandGuidelineService.deleteSupplement(id, user);

            LoggingUtils.logInfo(logger, "Successfully deleted supplement brand guideline with ID: {} for user: {}",
                    id, user.getId());

            return ResponseEntity.ok(new ApiResponse<>("Supplement brand guideline deleted successfully"));

        } catch (SupplementBrandGuidelineNotFoundException e) {
            LoggingUtils.logWarn(logger, "Supplement brand guideline not found with ID: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("SUPPLEMENT_NOT_FOUND", "Supplement brand guideline not found"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error deleting supplement brand guideline with ID {}: {}", id, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/supplements/manage/{id} DELETE",
                    "Failed to delete supplement brand guideline: " + id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("DELETION_ERROR", "Error deleting supplement: " + e.getMessage()));
        }
    }
}