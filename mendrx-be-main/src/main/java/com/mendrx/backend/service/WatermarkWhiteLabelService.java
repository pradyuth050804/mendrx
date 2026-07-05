// WatermarkWhiteLabelService.java
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
public class WatermarkWhiteLabelService {

    private static final Logger logger = LoggerFactory.getLogger(WatermarkWhiteLabelService.class);

    private Storage storage;
    private final String BUCKET_NAME = "whitelabel-watermarks-wm";
    private final String PROJECT_ID = "wholisticmendprj";
    private static final long URL_EXPIRATION_DAYS = 2;
    private static final String WATERMARK_PATH_PREFIX = "user_";

    public WatermarkWhiteLabelService() {
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
    public String uploadWatermark(MultipartFile file, User user) throws Exception {

        if (file == null || user == null) {
            throw new IllegalArgumentException("File and user cannot be null");
        }
        // Delete old watermark if it exists
        if (user.getParent().getWatermarkFileName() != null) {
            deleteWatermarkIfExists(user.getParent().getWatermarkFileName());
        }

        String fileName = String.format("%s%s_%s_%s",
                WATERMARK_PATH_PREFIX,
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
            LoggingUtils.logError(logger, "Failed to upload watermark to storage", e);
            throw new RuntimeException("Failed to upload watermark", e);
        }
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "unnamed";
        return fileName.replaceAll("[^a-zA-Z0-9.-]", "_");
    }

    public void deleteWatermarkIfExists(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return;
        }

        try {
            BlobId blobId = BlobId.of(BUCKET_NAME, filename);
            boolean deleted = storage.delete(blobId);
            if (!deleted) {
                LoggingUtils.logWarn(logger, "Watermark file not found for deletion: {}", filename);
            } else {
                LoggingUtils.logInfo(logger, "Successfully deleted watermark: {}", filename);
            }
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error deleting watermark: {}", filename, e);
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