package com.mendrx.backend.controller;

import com.mendrx.backend.enums.WhiteLabelType;
import com.mendrx.backend.model.Parent;
import com.mendrx.backend.model.User;
import com.mendrx.backend.model.response.ApiResponse;
import com.mendrx.backend.model.response.WhiteLabelConfigResponseModel;
import com.mendrx.backend.repository.ParentRepository;
import com.mendrx.backend.service.*;
import com.mendrx.backend.util.LoggingUtils;
import io.micrometer.common.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
public class CustomizationController {

    private static final Logger logger = LoggerFactory.getLogger(CustomizationController.class);

    private static final int WHITE_LABEL_COST = 2000;
    private static final int MAX_LOGO_SIZE_MB = 1;
    private static final int MAX_SIGNATURE_SIZE_MB = 1;

    @Autowired
    private LogoWhiteLabelService logoWhiteLabelService;

    @Autowired
    private WatermarkWhiteLabelService watermarkWhiteLabelService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtValidatorService jwtValidatorService;

    @Autowired
    private CustomSignatureService customSignatureService;

    @Autowired
    private SlackNotificationService slackNotificationService;

    @GetMapping("/white-label/config")
    public ResponseEntity<ApiResponse<WhiteLabelConfigResponseModel>> getConfig(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/white-label/config API invoked");

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

            WhiteLabelConfigResponseModel config = new WhiteLabelConfigResponseModel();
            config.setEnabled(user.getWhiteLabelEnabled());
            config.setUseParentWhiteLabels(user.getParent().getUseParentWhiteLabels());
            if (user.getParent().getWatermarkFileName() != null) {
                String signedUrl = watermarkWhiteLabelService.generateSignedUrl(user.getParent().getWatermarkFileName());
                config.setWatermarkUrl(signedUrl);
            }

            if (user.getWhiteLabelEnabled()) {
                config.setType(user.getWhiteLabelType());
                if (user.getWhiteLabelType() == WhiteLabelType.LOGO) {
                    // Generate signed URL from stored filename
                    String signedUrl = logoWhiteLabelService.generateSignedUrl(user.getWhiteLabelLogoFileName());
                    config.setLogoUrl(signedUrl);
                } else {
                    config.setText(user.getWhiteLabelText());
                }
                config.setSignoffSignatureFileName(user.getSignoffSignatureFileName());
                config.setSignoffName(user.getSignoffName());
                config.setSignoffDesignation(user.getSignoffDesignation());
                config.setCustomDisclaimer(user.getCustomDisclaimer());
            } else if (user.getParent().getUseParentWhiteLabels()) {
                config.setType(WhiteLabelType.LOGO);
                String signedUrl = logoWhiteLabelService.generateSignedUrl(user.getParent().getWhiteLabelLogoFileName());
                config.setLogoUrl(signedUrl);
                config.setSignoffSignatureFileName(customSignatureService.generateSignedUrl(user.getParent().getSignoffSignatureFileName()));
                config.setSignoffName(user.getParent().getSignoffName());
                config.setSignoffDesignation(user.getParent().getSignoffDesignation());
                config.setCustomDisclaimer(user.getParent().getCustomDisclaimer());
            }

            return ResponseEntity.ok(new ApiResponse<>(config));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error fetching white label config: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/white-label/config", "Failed to fetch white label configuration", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("CONFIG_FETCH_ERROR", "Error fetching white label configuration"));
        }
    }

    @PostMapping("/white-label/upload-logo")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadLogo(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("LOGO") MultipartFile file) {

        LoggingUtils.logInfo(logger, "/white-label/upload-logo API invoked");

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

            // Validate file size and type
            if (file.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_FILE", "File is empty"));
            }

            if (file.getSize() > MAX_LOGO_SIZE_MB * 1024 * 1024) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("FILE_TOO_LARGE",
                                String.format("File size must be less than %dMB", MAX_LOGO_SIZE_MB)));
            }

            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_FILE_TYPE", "Only JPEG and PNG files are allowed"));
            }

            // Upload new logo and get permanent URL
            String fileName = logoWhiteLabelService.uploadLogo(file, user);
            String signedUrl = logoWhiteLabelService.generateSignedUrl(fileName);

            // Update user settings
            user.setWhiteLabelType(WhiteLabelType.LOGO);
            user.setWhiteLabelLogoFileName(fileName);
            userService.save(user);

            return ResponseEntity.ok(new ApiResponse<>(Map.of("logoUrl", signedUrl)));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error uploading logo: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/white-label/upload-logo", "Failed to upload white label logo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPLOAD_ERROR", "Error uploading logo"));
        }
    }

    @PostMapping("/white-label/upload-watermark")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadWatermark(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("LOGO") MultipartFile file) {

        LoggingUtils.logInfo(logger, "/white-label/upload-watermark API invoked");

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

            // Validate file size and type
            if (file.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_FILE", "File is empty"));
            }

            if (file.getSize() > MAX_LOGO_SIZE_MB * 1024 * 1024) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("FILE_TOO_LARGE",
                                String.format("File size must be less than %dMB", MAX_LOGO_SIZE_MB)));
            }

            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_FILE_TYPE", "Only JPEG and PNG files are allowed"));
            }

            // Upload new logo and get permanent URL
            String fileName = watermarkWhiteLabelService.uploadWatermark(file, user);
            String signedUrl = watermarkWhiteLabelService.generateSignedUrl(fileName);

            userService.saveWatermarkFileNameInParent(user, fileName);

            return ResponseEntity.ok(new ApiResponse<>(Map.of("logoUrl", signedUrl)));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error uploading watermark: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/white-label/upload-watermark", "Failed to upload watermark", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPLOAD_ERROR", "Error uploading logo"));
        }
    }

    @DeleteMapping("/white-label/remove-watermark")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> removeWatermark(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/white-label/remove-watermark API invoked");

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

            // Check if watermark exists
            if (user.getParent().getWatermarkFileName() != null) {
                // Delete the file from storage
                watermarkWhiteLabelService.deleteWatermarkIfExists(user.getParent().getWatermarkFileName());

                // Update the user record
                userService.saveWatermarkFileNameInParent(user, null);
            }

            return ResponseEntity.ok(new ApiResponse<>(Map.of("removed", true)));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error removing watermark: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/white-label/remove-watermark", "Failed to remove watermark", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("REMOVE_ERROR", "Error removing watermark: " + e.getMessage()));
        }
    }

    @PostMapping("/white-label/set-text")
    public ResponseEntity<ApiResponse<Void>> setText(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request) {

        LoggingUtils.logInfo(logger, "/white-label/set-text API invoked");

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

            String text = request.get("text");
            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INVALID_TEXT", "Text cannot be empty"));
            }

            // If switching from logo to text, cleanup old logo
            if (user.getWhiteLabelType() == WhiteLabelType.LOGO) {
                logoWhiteLabelService.deleteLogoIfExists(user.getWhiteLabelLogoFileName());
                user.setWhiteLabelLogoFileName(null);
            }

            user.setWhiteLabelType(WhiteLabelType.TEXT);
            user.setWhiteLabelText(text.trim());
            userService.save(user);

            return ResponseEntity.ok(new ApiResponse<>("Text updated successfully"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error updating text: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/white-label/set-text", "Failed to update white label text", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("TEXT_UPDATE_ERROR", "Error updating text"));
        }
    }

    @PostMapping("/white-label/enable")
    public ResponseEntity<ApiResponse<Void>> enable(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/white-label/enable API invoked");

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

            if (!user.getWhiteLabelEnabled() && user.getCredits() < WHITE_LABEL_COST) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new ApiResponse<>("INSUFFICIENT_CREDITS",
                                String.format("Insufficient credits. %d credits are required for white labeling", WHITE_LABEL_COST)));
            }

            if (!user.getWhiteLabelEnabled()) {
                user.setCredits(user.getCredits() - WHITE_LABEL_COST);
                user.setWhiteLabelEnabled(true);
                userService.save(user);
            }

            return ResponseEntity.ok(new ApiResponse<>("White labeling enabled successfully"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error enabling white label: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/white-label/enable", "Failed to enable white labeling", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ENABLE_ERROR", "Error enabling white labeling"));
        }
    }

    @GetMapping("/custom-signature")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSignOff(
            @RequestHeader("Authorization") String authHeader) {

        LoggingUtils.logInfo(logger, "/custom-signature API invoked");

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
            response.put("name", StringUtils.isEmpty(user.getSignoffName())? user.getParent().getSignoffName(): user.getSignoffName());
            response.put("designation", StringUtils.isEmpty(user.getSignoffDesignation()) ? user.getParent().getSignoffDesignation() : user.getSignoffDesignation());

            if (user.getSignoffSignatureFileName() != null) {
                String signedUrl = customSignatureService.generateSignedUrl(StringUtils.isEmpty(user.getSignoffSignatureFileName()) ? user.getParent().getSignoffSignatureFileName() : user.getSignoffSignatureFileName());
                response.put("signatureUrl", signedUrl);
            }

            return ResponseEntity.ok(new ApiResponse<>(response));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error fetching sign-off details: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/custom-signature", "Failed to fetch custom signature details", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("FETCH_ERROR", "Error fetching sign-off details"));
        }
    }

    @PutMapping("/custom-signature")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateSignOff(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("name") String name,
            @RequestParam("designation") String designation,
            @RequestParam(value = "signature", required = false) MultipartFile signatureFile) {

        LoggingUtils.logInfo(logger, "/custom-signature put API invoked");

        String token = authHeader.replace("Bearer ", "");
        if (!jwtValidatorService.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("UNAUTHORIZED", "Invalid or expired token"));
        }

        if (name == null || name.trim().isEmpty() || designation == null || designation.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse<>("INVALID_INPUT", "Name and designation are required"));
        }

        try {
            User user = userService.getUserByToken(token);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse<>("USER_NOT_FOUND", "User not found"));
            }

            // Update name and designation
            user.setSignoffName(name.trim());
            user.setSignoffDesignation(designation.trim());

            // Handle signature file if provided
            if (signatureFile != null && !signatureFile.isEmpty()) {
                // Validate file size and type
                if (signatureFile.getSize() > MAX_SIGNATURE_SIZE_MB * 1024 * 1024) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse<>("FILE_TOO_LARGE",
                                    String.format("File size must be less than %dMB", MAX_SIGNATURE_SIZE_MB)));
                }

                String contentType = signatureFile.getContentType();
                // Check for allowed image types
                Set<String> allowedTypes = Set.of(
                        "image/jpeg",
                        "image/jpg",
                        "image/png",
                        "image/heic",
                        "image/heif"
                );

                if (contentType == null || !allowedTypes.contains(contentType.toLowerCase())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body(new ApiResponse<>("INVALID_FILE_TYPE", "Only JPG, PNG and HEIC images are allowed"));
                }

                // Upload new signature and get URL
                String fileName = customSignatureService.uploadSignature(signatureFile, user);
                user.setSignoffSignatureFileName(fileName);
            }

            userService.save(user);

            // Prepare response
            Map<String, String> response = new HashMap<>();
            response.put("name", user.getSignoffName());
            response.put("designation", user.getSignoffDesignation());
            if (user.getSignoffSignatureFileName() != null) {
                String signedUrl = customSignatureService.generateSignedUrl(user.getSignoffSignatureFileName());
                response.put("signatureUrl", signedUrl);
            }

            return ResponseEntity.ok(new ApiResponse<>(response, "Sign-off updated successfully"));
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error updating sign-off: {}", e.getMessage(), e);
            slackNotificationService.sendErrorNotification("/custom-signature", "Failed to update custom signature", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("UPDATE_ERROR", "Error updating sign-off"));
        }
    }
}