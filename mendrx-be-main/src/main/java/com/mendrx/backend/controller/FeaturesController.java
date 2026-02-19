package com.mendrx.backend.controller;

import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.service.*;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
public class FeaturesController {

    private static final Logger logger = LoggerFactory.getLogger(FeaturesController.class);

    @Autowired
    private JwtValidatorService jwtValidatorService;
    @Autowired
    private SnDPlanService snDPlanService;
    @Autowired
    private LifestyleRecService lifestyleRecService;
    @Autowired
    private SlackNotificationService slackNotificationService;

    @GetMapping("/features/{reportId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkFeaturesExist(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String reportId) {

        LoggingUtils.logInfo(logger, "/features/{} API invoked", reportId);

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid or expired token for features check for report ID: {}", reportId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UUID userAuthId = jwtValidatorService.getSubjectFromToken(token);
            if (userAuthId == null) {
                LoggingUtils.logWarn(logger, "User not found for features check for report ID: {}", reportId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }
            
            LoggingUtils.logInfo(logger, "Checking features existence for report ID: {}", reportId);
            UUID reportUuid = UUID.fromString(reportId);
            boolean sndPlanExists = snDPlanService.existsByReportId(reportUuid);
            boolean lifestyleRecExists = lifestyleRecService.existsByReportId(reportUuid);
            Map<String, Boolean> response = Map.of("sndPlanExists", sndPlanExists, "lifestyleRecExists", lifestyleRecExists);
            LoggingUtils.logInfo(logger, "Features check completed for report ID: {}. SnD Plan exists: {}, Lifestyle Rec exists: {}", reportId, sndPlanExists, lifestyleRecExists);
            return ResponseEntity.ok(new ApiResponse<>(response));

        } catch (IllegalArgumentException e) {
            LoggingUtils.logWarn(logger, "Invalid report ID format for features check: {}", reportId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_REPORT_ID", "Invalid report ID format"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error checking features existence for report ID {}: {}", reportId, e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/features/{reportId}", "Failed to check features existence for report: " + reportId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("CHECK_ERROR", "Error checking features existence: " + e.getMessage()));
        }
    }
}
