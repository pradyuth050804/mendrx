// LogoWhiteLabelService.java
package com.mendrx.backend.service;

import com.google.cloud.storage.*;
import com.mendrx.backend.model.User;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.util.Arrays;
import java.util.Collections;
import java.util.concurrent.TimeUnit;

@Service
public class LogoWhiteLabelService {

    private static final Logger logger = LoggerFactory.getLogger(LogoWhiteLabelService.class);

    private Storage storage;
    private final String BUCKET_NAME = "whitelabel-logos-wm";
    private final String PROJECT_ID = "wholisticmendprj";
    private static final long URL_EXPIRATION_DAYS = 2;
    private static final String LOGO_PATH_PREFIX = "user_";  // Changed from "logos/"

    public LogoWhiteLabelService() {
        StorageOptions options = StorageOptions.newBuilder()
                .setProjectId(PROJECT_ID)
                .build();
        this.storage = options.getService();

        // Optional: Test bucket access during initialization
        try {
            Bucket bucket = storage.get(BUCKET_NAME);
            LoggingUtils.logInfo(logger, "Successfully accessed bucket: {}", bucket.getName());
            configureBucketCors();
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to access bucket: {}", e.getMessage());
        }
    }

    @Transactional
    public String uploadLogo(MultipartFile file, User user) throws Exception {

        if (file == null || user == null) {
            throw new IllegalArgumentException("File and user cannot be null");
        }
        // Delete old logo if it exists
        if (user.getWhiteLabelLogoFileName() != null) {
            deleteLogoIfExists(user.getWhiteLabelLogoFileName());
        }

        String fileName = String.format("%s%s_%s_%s",
                LOGO_PATH_PREFIX,
                user.getId().toString(),
                System.currentTimeMillis(),
                sanitizeFileName(file.getOriginalFilename()));

        BlobId blobId = BlobId.of(BUCKET_NAME, fileName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType())
                .build();

        try {
            storage.create(blobInfo, file.getBytes());
            return fileName;
        } catch (StorageException e) {
            LoggingUtils.logError(logger, "Failed to upload logo to storage", e);
            throw new RuntimeException("Failed to upload logo", e);
        }
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "unnamed";
        return fileName.replaceAll("[^a-zA-Z0-9.-]", "_");
    }

    public void deleteLogoIfExists(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return;
        }

        try {
            BlobId blobId = BlobId.of(BUCKET_NAME, filename);
            boolean deleted = storage.delete(blobId);
            if (!deleted) {
                LoggingUtils.logWarn(logger, "Logo file not found for deletion: {}", filename);
            } else {
                LoggingUtils.logInfo(logger, "Successfully deleted logo: {}", filename);
            }
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error deleting logo: {}", filename, e);
        }
    }

    public String generateSignedUrl(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return null;
        }

        try {
            BlobId blobId = BlobId.of(BUCKET_NAME, fileName);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId).build();

            URL signedUrl = storage.signUrl(blobInfo,
                    URL_EXPIRATION_DAYS * 24,
                    TimeUnit.HOURS,
                    Storage.SignUrlOption.withV4Signature());

            return signedUrl.toString();
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error generating signed URL for file: {}", fileName, e);
            return null;
        }
    }

    public void configureBucketCors() {
        try {
            Bucket bucket = storage.get(BUCKET_NAME);

            Cors cors = Cors.newBuilder()
                    .setMaxAgeSeconds(3600)
                    .setMethods(Arrays.asList(
                            HttpMethod.GET,
                            HttpMethod.HEAD
                    ))
                    .setOrigins(Collections.singletonList(
                            Cors.Origin.of("https://mendrx.in")
                    ))
                    .setResponseHeaders(Arrays.asList(
                            "Content-Type",
                            "Access-Control-Allow-Origin"
                    ))
                    .build();

            bucket.toBuilder()
                    .setCors(Arrays.asList(cors))
                    .build()
                    .update();

            LoggingUtils.logInfo(logger, "Successfully configured CORS for bucket: {}", BUCKET_NAME);
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to configure CORS for bucket: {}", e.getMessage());
        }
    }


}