package com.mendrx.backend.controller;

import com.mendrx.backend.model.request.FreeTrailRequestModel;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.service.JwtValidatorService;
import com.mendrx.backend.service.LeadService;
import com.mendrx.backend.service.SlackNotificationService;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/lead")
public class LeadController {
    private static final Logger logger = LoggerFactory.getLogger(LeadController.class);

    @Autowired
    private LeadService leadService;
    @Autowired
    private JwtValidatorService jwtValidatorService;
    @Autowired
    private SlackNotificationService slackNotificationService;

    @PostMapping("/free-trial")
    public ResponseEntity<ApiResponse<Void>> registerUser(@RequestHeader("Authorization") String authHeader,
                                                             @RequestBody FreeTrailRequestModel freeTrailRequest) {

        LoggingUtils.logInfo(logger, "/lead/free-trial API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            LoggingUtils.logWarn(logger, "Invalid or expired token for lead registration");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));        }

        try {
            LoggingUtils.logInfo(logger, "Registering lead for free trial");
            leadService.registerLead(token, freeTrailRequest);
            LoggingUtils.logInfo(logger, "Successfully registered lead for free trial");

            return ResponseEntity.ok(new ApiResponse<>());
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Lead registration failed: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/lead/free-trial", "Failed to register lead for free trial", e);
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>("REGISTRATION_FAILED", "Registration failed: " + e.getMessage()));
        }
    }
}
