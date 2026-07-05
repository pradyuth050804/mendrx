package com.mendrx.backend.service;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mendrx.backend.model.shared.BloodMarker;
import com.mendrx.backend.model.shared.ParameterData;
import com.mendrx.backend.model.shared.ParameterInfo;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;

@Service
public class SupabaseVaultService {
    private static final Logger logger = LoggerFactory.getLogger(SupabaseVaultService.class);
    private static final String encryptionKey = "report_encryption_key";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper;

    public SupabaseVaultService() {
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .addMixIn(ParameterData.class, ParameterDataMixin.class);
    }

    @PostConstruct
    private void validateConfig() {
    }

    public byte[] encryptClientHistory(String clientHistory) {
        if (clientHistory == null) return null;

        try {
            return jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_encrypt(?::text, ?, 'cipher-algo=aes256')",
                    byte[].class,
                    clientHistory,
                    encryptionKey
            );
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to encrypt clientHistory", e);
            throw new VaultEncryptionException("Failed to encrypt clientHistory", e);
        }
    }

    public String decryptClientHistory(byte[] clientHistoryEncrypted) {
        if (clientHistoryEncrypted == null) return null;

        try {
            String decrypted = jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_decrypt(?, ?)",
                    String.class,
                    clientHistoryEncrypted,
                    encryptionKey
            );

            if (decrypted == null) {
                throw new VaultDecryptionException("Decryption resulted in null data");
            }

            return decrypted;
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to decrypt clientHistory", e);
            throw new VaultDecryptionException("Failed to decrypt clientHistory", e);
        }
    }

    private interface ParameterDataMixin {
        @JsonIgnore
        ParameterInfo getParameterDetails();
    }

    public byte[] encryptBloodMarkers(List<BloodMarker> bloodMarkers) {
        if (bloodMarkers == null) return null;

        try {
            String jsonData = objectMapper.writeValueAsString(bloodMarkers);
            return jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_encrypt(?::text, ?, 'cipher-algo=aes256')",
                    byte[].class,
                    jsonData,
                    encryptionKey
            );
        } catch (JsonProcessingException e) {
            LoggingUtils.logError(logger, "Failed to serialize blood markers", e);
            throw new VaultEncryptionException("Failed to encrypt blood markers", e);
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Database encryption failed", e);
            throw new VaultEncryptionException("Database encryption failed", e);
        }
    }

    public List<BloodMarker> decryptBloodMarkers(byte[] encrypted) {
        if (encrypted == null) return null;

        try {
            String decrypted = jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_decrypt(?, ?)",
                    String.class,
                    encrypted,
                    encryptionKey
            );

            if (decrypted == null) {
                throw new VaultDecryptionException("Decryption resulted in null data");
            }

            return objectMapper.readValue(decrypted, new TypeReference<List<BloodMarker>>() {});
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to decrypt blood markers", e);
            throw new VaultDecryptionException("Failed to decrypt blood markers", e);
        }
    }

    public byte[] encryptNotes(String notes) {
        if (notes == null) return null;

        try {
            return jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_encrypt(?::text, ?, 'cipher-algo=aes256')",
                    byte[].class,
                    notes,
                    encryptionKey
            );
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to encrypt notes", e);
            throw new VaultEncryptionException("Failed to encrypt notes", e);
        }
    }

    public String decryptNotes(byte[] encrypted) {
        if (encrypted == null) return null;

        try {
            String decrypted = jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_decrypt(?, ?)",
                    String.class,
                    encrypted,
                    encryptionKey
            );

            if (decrypted == null) {
                throw new VaultDecryptionException("Decryption resulted in null data");
            }

            return decrypted;
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to decrypt notes", e);
            throw new VaultDecryptionException("Failed to decrypt notes", e);
        }
    }

    public byte[] encryptDietConfig(String dietConfig) {
        if (dietConfig == null) return null;

        try {
            return jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_encrypt(?::text, ?, 'cipher-algo=aes256')",
                    byte[].class,
                    dietConfig,
                    encryptionKey
            );
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to encrypt diet config", e);
            throw new VaultEncryptionException("Failed to encrypt diet config", e);
        }
    }

    public String decryptDietConfig(byte[] encrypted) {
        if (encrypted == null) return null;

        try {
            String decrypted = jdbcTemplate.queryForObject(
                    "SELECT pgp_sym_decrypt(?, ?)",
                    String.class,
                    encrypted,
                    encryptionKey
            );

            if (decrypted == null) {
                throw new VaultDecryptionException("Decryption resulted in null data");
            }

            return decrypted;
        } catch (Exception e) {
            LoggingUtils.logError(logger, "Failed to decrypt diet config", e);
            throw new VaultDecryptionException("Failed to decrypt diet config", e);
        }
    }
}

// Custom exceptions
class VaultEncryptionException extends RuntimeException {
    public VaultEncryptionException(String message) {
        super(message);
    }

    public VaultEncryptionException(String message, Throwable cause) {
        super(message, cause);
    }
}

class VaultDecryptionException extends RuntimeException {
    public VaultDecryptionException(String message) {
        super(message);
    }

    public VaultDecryptionException(String message, Throwable cause) {
        super(message, cause);
    }
}