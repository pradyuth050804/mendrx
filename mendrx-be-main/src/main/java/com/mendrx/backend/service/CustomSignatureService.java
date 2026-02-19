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
public class CustomSignatureService {
    private static final Logger logger = LoggerFactory.getLogger(CustomSignatureService.class);

    private Storage storage;
    private final String BUCKET_NAME = "custom-signatures";
    private final String PROJECT_ID = "forward-lead-434016-r2";
    private static final long URL_EXPIRATION_DAYS = 2;
    private static final String SIGNATURE_PATH_PREFIX = "signature_";

    public CustomSignatureService() {
        StorageOptions options = StorageOptions.newBuilder()
                .setProjectId(PROJECT_ID)
                .build();
        this.storage = options.getService();

        try {
            Bucket bucket = storage.get(BUCKET_NAME);
            LoggingUtils.logInfo(logger, "Successfully accessed signatures bucket: {}", bucket.getName());
            configureBucketCors();
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to access signatures bucket: {}", e.getMessage());
        }
    }

    @Transactional
    public String uploadSignature(MultipartFile file, User user) throws Exception {
        if (file == null || user == null) {
            throw new IllegalArgumentException("File and user cannot be null");
        }

        // Delete old signature if it exists
        if (user.getSignoffSignatureFileName() != null) {
            deleteSignatureIfExists(user.getSignoffSignatureFileName());
        }

        String fileName = String.format("%s%s_%s_%s",
                SIGNATURE_PATH_PREFIX,
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
            LoggingUtils.logError(logger, "Failed to upload signature to storage", e);
            throw new RuntimeException("Failed to upload signature", e);
        }
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "unnamed";
        return fileName.replaceAll("[^a-zA-Z0-9.-]", "_");
    }

    public void deleteSignatureIfExists(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return;
        }

        try {
            BlobId blobId = BlobId.of(BUCKET_NAME, filename);
            boolean deleted = storage.delete(blobId);
            if (!deleted) {
                LoggingUtils.logWarn(logger, "Signature file not found for deletion: {}", filename);
            } else {
                LoggingUtils.logInfo(logger, "Successfully deleted signature: {}", filename);
            }
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Error deleting signature: {}", filename, e);
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
            LoggingUtils.logError(logger, "Error generating signed URL for signature: {}", fileName, e);
            return null;
        }
    }

    private void configureBucketCors() {
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

            LoggingUtils.logInfo(logger, "Successfully configured CORS for signatures bucket: {}", BUCKET_NAME);
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to configure CORS for signatures bucket: {}", e.getMessage());
        }
    }
}