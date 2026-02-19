package com.mendrx.backend.controller;

import com.mendrx.backend.exception.DietPlanNotFoundException;
import com.mendrx.backend.exception.DietPlanVersionsExhaustedException;
import com.mendrx.backend.exception.SnDPlanNotFoundException;
import com.mendrx.backend.model.DietPlan;
import com.mendrx.backend.model.Report;
import com.mendrx.backend.model.SnDPlan;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.request.GenerateDietPlanRequestModel;
import com.mendrx.backend.model.request.GenerateSnDPlanRequestModel;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.DietPlanResponseModel;
import com.mendrx.backend.model.response.SnDPlanResponseModel;
import com.mendrx.backend.service.JwtValidatorService;
import com.mendrx.backend.service.ReportService;
import com.mendrx.backend.service.SlackNotificationService;
import com.mendrx.backend.service.SnDPlanService;
import com.mendrx.backend.service.UserService;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
public class SnDPlanController {

    private static final Logger logger = LoggerFactory.getLogger(SnDPlanController.class);

    private static final int CREDITS_PER_SND_PLAN = 100;
    private static final int CREDITS_PER_ADDITIONAL_DIET_PLAN_VERSION = 50;

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private UserService userService;

    @Autowired
    private ReportService reportService;

    @Autowired
    private SnDPlanService snDPlanService;

    @Autowired
    private SlackNotificationService slackNotificationService;

    @GetMapping("/snd-plan/exists/{reportId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkPlanExists(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reportId) {

        LoggingUtils.logInfo(logger, "/snd-plan/exists/{} API invoked", reportId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                LoggingUtils.logWarn(logger, "User not found for SnD plan existence check for report ID: {}", reportId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }
            
            LoggingUtils.logInfo(logger, "Checking SnD plan existence for report ID: {}", reportId);
            UUID reportUuid = UUID.fromString(reportId);
            boolean exists = snDPlanService.existsByReportId(reportUuid);
            Map<String, Boolean> response = Map.of("exists", exists);
            LoggingUtils.logInfo(logger, "SnD plan existence check completed for report ID: {}. Exists: {}", reportId, exists);
            return ResponseEntity.ok(new ApiResponse<>(response));

        } catch (IllegalArgumentException e) {
            LoggingUtils.logWarn(logger, "Invalid report ID format for SnD plan existence check: {}", reportId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error checking SnD plan existence for report ID {}: {}", reportId, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/snd-plan/exists/{reportId}", "Failed to check SnD plan existence for report: " + reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("CHECK_ERROR", "Error checking plan existence: " + e.getMessage()));
        }
    }

    @PostMapping("/snd-plan/generate")
    public ResponseEntity<ApiResponse<SnDPlanResponseModel>> generatePlan(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody GenerateSnDPlanRequestModel request) {

        LoggingUtils.logInfo(logger, "/snd-plan/generate API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid or expired token for SnD plan generation");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                LoggingUtils.logWarn(logger, "User not found for SnD plan generation");
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            } else if (user.getCredits() < CREDITS_PER_SND_PLAN) {
                LoggingUtils.logWarn(logger, "Insufficient credits for user: {}. Required: {}, Available: {}", user.getId(), CREDITS_PER_SND_PLAN, user.getCredits());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("INSUFFICIENT_CREDITS",
                                String.format("Insufficient credits. %d credits are required per plan", CREDITS_PER_SND_PLAN)));
            } else if (user.getSubscriptionExpiry().isBefore(LocalDateTime.now())) {
                LoggingUtils.logWarn(logger, "Subscription expired for user: {}", user.getId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("SUBSCRIPTION_EXPIRED", "Subscription expired. Please renew your subscription"));
            }

            Report report = reportService.getReportForUser(request.getReportId());

            if (report == null || !report.getUser().getId().equals(user.getId())) {
                LoggingUtils.logWarn(logger, "Report not found or access denied for report ID: {}", request.getReportId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found or access denied"));
            }

            LoggingUtils.logInfo(logger, "Starting SnD plan generation for report ID: {}", request.getReportId());
            SnDPlan snDPlan = snDPlanService.generateSnDPlan(report, request);
            user = userService.deductCredits(user, CREDITS_PER_SND_PLAN);
            LoggingUtils.logInfo(logger, "Successfully generated SnD plan for report ID: {}, Credits deducted: {}", request.getReportId(), CREDITS_PER_SND_PLAN);

            SnDPlanResponseModel responseModel = new SnDPlanResponseModel();
            responseModel.setSnDPlan(snDPlan);
            responseModel.setConsumedCredits(CREDITS_PER_SND_PLAN);
            responseModel.setUpdatedCredits(user.getCredits());

            return ResponseEntity.ok(new ApiResponse<>(responseModel));

        } catch (IllegalArgumentException e) {
            LoggingUtils.logWarn(logger, "Invalid report ID format for SnD plan generation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error generating SnD plan: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/snd-plan/generate", "Failed to generate SnD plan", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("GENERATION_ERROR", "Error generating snd plan: " + e.getMessage()));
        }
    }

    @PostMapping("/diet-plan/generate")
    public ResponseEntity<ApiResponse<DietPlanResponseModel>> generateAdditionalDietPlan(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody GenerateDietPlanRequestModel request) {

        LoggingUtils.logInfo(logger, "/diet-plan/generate API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {

            User user = userService.getUserByToken(token);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            } else if (user.getCredits() < CREDITS_PER_ADDITIONAL_DIET_PLAN_VERSION) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("INSUFFICIENT_CREDITS",
                                String.format("Insufficient credits. %d credits are required per plan", CREDITS_PER_ADDITIONAL_DIET_PLAN_VERSION)));
            } else if (user.getSubscriptionExpiry().isBefore(LocalDateTime.now())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("SUBSCRIPTION_EXPIRED", "Subscription expired. Please renew your subscription"));
            }

            Report report = reportService.getReportForUser(request.getReportId());

            if (report == null || !report.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("REPORT_NOT_FOUND", "Report not found or access denied"));
            }

            DietPlan dietPlan = snDPlanService.generateAdditionalDietPlan(
                    report,
                    request);

            user = userService.deductCredits(user, CREDITS_PER_ADDITIONAL_DIET_PLAN_VERSION);

            // Create response
            DietPlanResponseModel responseModel = new DietPlanResponseModel();
            responseModel.setDietPlan(dietPlan);
            responseModel.setConsumedCredits(CREDITS_PER_ADDITIONAL_DIET_PLAN_VERSION);
            responseModel.setUpdatedCredits(user.getCredits());

            return ResponseEntity.ok(new ApiResponse<>(responseModel));

        } catch (DietPlanVersionsExhaustedException e) {
            LoggingUtils.logWarn(logger, "Diet plan versions exhausted: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("DIET_PLAN_VERSIONS_EXHAUSTED", e.getMessage()));
        } catch (SnDPlanNotFoundException e) {
            LoggingUtils.logWarn(logger, "SnD plan not found for additional diet plan generation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("SND_PLAN_NOT_FOUND", "Supplements and Diet Plan not found"));
        } catch (IllegalArgumentException e) {
            LoggingUtils.logWarn(logger, "Invalid report ID format for additional diet plan generation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error generating additional diet plan: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/diet-plan/generate", "Failed to generate additional diet plan", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("GENERATION_ERROR", "Error generating diet plan: " + e.getMessage()));
        }
    }

    @GetMapping("/snd-plan/{reportId}")
    public ResponseEntity<ApiResponse<SnDPlan>> getPlan(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reportId) {

        LoggingUtils.logInfo(logger, "/snd-plan/{} API invoked", reportId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                LoggingUtils.logWarn(logger, "User not found for SnD plan fetch for report ID: {}", reportId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }
            
            LoggingUtils.logInfo(logger, "Fetching SnD plan for report ID: {}", reportId);
            UUID reportUuid = UUID.fromString(reportId);
            SnDPlan plan = snDPlanService.getSnDPlan(reportUuid);

            if (plan == null) {
                LoggingUtils.logWarn(logger, "SnD plan not found for report ID: {}", reportId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("PLAN_NOT_FOUND", "Plan not found or access denied"));
            }

            LoggingUtils.logInfo(logger, "Successfully fetched SnD plan for report ID: {}", reportId);
            return ResponseEntity.ok(new ApiResponse<>(plan));

        } catch (IllegalArgumentException e) {
            LoggingUtils.logWarn(logger, "Invalid report ID format for SnD plan fetch: {}", reportId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error fetching SnD plan for report ID {}: {}", reportId, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/snd-plan/{reportId}", "Failed to fetch SnD plan for report: " + reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error fetching plan: " + e.getMessage()));
        }
    }

    @PutMapping("/snd-plan/{reportId}/supplements")
    public ResponseEntity<ApiResponse<SnDPlan>> updateSupplements(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reportId,
            @RequestBody SnDPlan updatedPlan) {

        LoggingUtils.logInfo(logger, "/snd-plan/{}/supplements PUT API invoked", reportId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            LoggingUtils.logInfo(logger, "Updating supplements for report ID: {}", reportId);
            UUID reportUuid = UUID.fromString(reportId);
            SnDPlan result = snDPlanService.updateSupplements(reportUuid, updatedPlan.getSupplements(), updatedPlan.getSupplementNotes());
            LoggingUtils.logInfo(logger, "Successfully updated supplements for report ID: {}", reportId);
            return ResponseEntity.ok(new ApiResponse<>(result));

        } catch (SnDPlanNotFoundException e) {
            LoggingUtils.logWarn(logger, "SnD plan not found for supplements update, report ID: {}", reportId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("PLAN_NOT_FOUND", "Plan not found or access denied"));
        } catch (IllegalArgumentException e) {
            LoggingUtils.logWarn(logger, "Invalid report ID format for supplements update: {}", reportId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error updating supplements for report ID {}: {}", reportId, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/snd-plan/{reportId}/supplements", "Failed to update supplements for report: " + reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPDATE_ERROR", "Error updating supplements: " + e.getMessage()));
        }
    }

    @PutMapping("/diet-plan")
    public ResponseEntity<ApiResponse<DietPlan>> updateDietPlan(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody DietPlan updatedVersion) {

        LoggingUtils.logInfo(logger, "/diet-plan PUT API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            if (updatedVersion.getId() == null) {
                LoggingUtils.logWarn(logger, "Diet plan ID is required for update");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_VERSION_ID", "Diet plan ID is required"));
            }

            LoggingUtils.logInfo(logger, "Updating diet plan with ID: {}", updatedVersion.getId());
            DietPlan result = snDPlanService.updateDietPlan(updatedVersion);
            LoggingUtils.logInfo(logger, "Successfully updated diet plan with ID: {}", updatedVersion.getId());
            return ResponseEntity.ok(new ApiResponse<>(result));

        } catch (DietPlanNotFoundException e) {
            LoggingUtils.logWarn(logger, "Diet plan not found for update: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse<>("DIET_PLAN_NOT_FOUND", "Diet plan not found"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error updating diet plan: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/diet-plan", "Failed to update diet plan", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPDATE_ERROR", "Error updating diet plan version: " + e.getMessage()));
        }
    }

}