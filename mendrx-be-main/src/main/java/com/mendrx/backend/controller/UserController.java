package com.mendrx.backend.controller;

import com.mendrx.backend.dto.UserDTO;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.service.JwtValidatorService;
import com.mendrx.backend.service.SlackNotificationService;
import com.mendrx.backend.service.UserService;
import com.mendrx.backend.util.LoggingUtils;
import io.micrometer.common.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;
    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private SlackNotificationService slackNotificationService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> registerUser(@RequestHeader("Authorization") String authHeader,
                                                    @RequestBody User user) {

        LoggingUtils.logInfo(logger, "/register API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));        }

        try {
            UserDTO registeredUserDTO = userService.registerUser(token, user.getEmail());
            if(registeredUserDTO.getCredits()==0) {
                return ResponseEntity.ok(new ApiResponse<>(registeredUserDTO, "Sign up successful. Congratulations!"));
            }
            return ResponseEntity.ok(new ApiResponse<>(registeredUserDTO, String.format("%d credits have been granted for signing up. Congratulations!", registeredUserDTO.getCredits())));
        } catch (Exception e) {
            String errorMsg = "User registration failed";
            LoggingUtils.logError(logger, errorMsg + " for email: " + user.getEmail(), e);
            slackNotificationService.sendErrorNotification(
                "POST /register",
                errorMsg + " for user: " + user.getEmail() + ". Error: " + e.getMessage(),
                e
            );
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>("REGISTRATION_FAILED", "Registration failed: " + e.getMessage()));
        }
    }

    @GetMapping("/user")
    public ResponseEntity<ApiResponse<UserDTO>> getUser(@RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/user API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        try {
            UserDTO userDTO = userService.getUserDTOByToken(token);
            if (userDTO != null) {
                return ResponseEntity.ok(new ApiResponse<>(userDTO));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }
        } catch (Exception e) {
            String errorMsg = "Error fetching user information";
            LoggingUtils.logError(logger, errorMsg + " for token validation", e);
            slackNotificationService.sendErrorNotification(
                "GET /user",
                errorMsg + ". Error: " + e.getMessage(),
                e
            );
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>("ERROR_FETCHING_USER", "Error fetching user: " + e.getMessage()));
        }
    }

    @GetMapping("/user/disclaimer")
    public ResponseEntity<ApiResponse<Map<String, String>>> getDisclaimer(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/user/disclaimer GET API invoked");

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
            }

            Map<String, String> response = new HashMap<>();
            response.put("customDisclaimer", StringUtils.isEmpty(user.getCustomDisclaimer()) ? user.getParent().getCustomDisclaimer() : user.getCustomDisclaimer());

            return ResponseEntity.ok(new ApiResponse<>(response));
        } catch (Exception e) {
            String errorMsg = "Error fetching user disclaimer";
            LoggingUtils.logError(logger, errorMsg + " for authenticated user", e);
            slackNotificationService.sendErrorNotification(
                "GET /user/disclaimer",
                errorMsg + ". Error: " + e.getMessage(),
                e
            );
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>("ERROR_FETCHING_DISCLAIMER", "Error fetching disclaimer: " + e.getMessage()));
        }
    }

    @PutMapping("/user/disclaimer")
    public ResponseEntity<ApiResponse<UserDTO>> updateDisclaimer(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> payload) {

        LoggingUtils.logInfo(logger, "/user/disclaimer PUT API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        String disclaimer = payload.get("disclaimer");
        if (disclaimer == null || disclaimer.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>("INVALID_DISCLAIMER", "Disclaimer cannot be empty"));
        }

        try {
            UserDTO updatedUser = userService.updateCustomDisclaimer(token, disclaimer.trim());
            return ResponseEntity.ok(new ApiResponse<>(updatedUser, "Disclaimer updated successfully"));
        } catch (Exception e) {
            String errorMsg = "Failed to update user disclaimer";
            LoggingUtils.logError(logger, errorMsg + " for authenticated user with disclaimer: " + disclaimer, e);
            slackNotificationService.sendErrorNotification(
                "PUT /user/disclaimer",
                errorMsg + ". Error: " + e.getMessage(),
                e
            );
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>("UPDATE_FAILED", "Failed to update disclaimer: " + e.getMessage()));
        }
    }
}
