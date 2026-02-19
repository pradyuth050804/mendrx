package com.mendrx.backend.service;

import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.JwkProviderBuilder;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.mendrx.backend.util.LoggingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.security.interfaces.ECPublicKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class JwtValidatorService {

    private static final Logger logger = LoggerFactory.getLogger(JwtValidatorService.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    private JwkProvider jwkProvider;

    public boolean validateToken(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            String alg = jwt.getAlgorithm();
            String keyId = jwt.getKeyId();
            String issuer = jwt.getIssuer();

            LoggingUtils.logInfo(logger,
                    "Validating token - Alg: " + alg + ", KeyId: " + keyId + ", Issuer: " + issuer);

            // If legacy HS256, use secret
            if ("HS256".equals(alg)) {
                Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
                JWT.require(algorithm).build().verify(token);
                return true;
            }

            // Otherwise, use JWKS for RS256 / ES256
            if (jwkProvider == null) {
                // Construct JWKS URL from issuer.
                // Issuer: https://<ref>.supabase.co/auth/v1
                // Correct public JWKS: https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
                String jwksUrl;
                if (issuer.endsWith("/")) {
                    jwksUrl = issuer + ".well-known/jwks.json";
                } else {
                    jwksUrl = issuer + "/.well-known/jwks.json";
                }

                LoggingUtils.logInfo(logger, "Initializing JWKS Provider with URL: " + jwksUrl);

                this.jwkProvider = new JwkProviderBuilder(new URL(jwksUrl))
                        .cached(10, 24, TimeUnit.HOURS)
                        .rateLimited(10, 1, TimeUnit.MINUTES)
                        .build();
            }

            Jwk jwk = jwkProvider.get(keyId);
            Algorithm algorithm = null;

            if ("RS256".equals(alg)) {
                algorithm = Algorithm.RSA256((RSAPublicKey) jwk.getPublicKey(), null);
            } else if ("ES256".equals(alg)) {
                algorithm = Algorithm.ECDSA256((ECPublicKey) jwk.getPublicKey(), null);
            }

            if (algorithm == null) {
                throw new IllegalArgumentException("Unsupported algorithm: " + alg);
            }

            JWT.require(algorithm)
                    .withIssuer(issuer)
                    .build()
                    .verify(token);

            return true;
        } catch (Exception exception) {
            LoggingUtils.logError(logger, "Token validation failed: " + exception.getMessage(), exception);
            return false;
        }
    }

    public UUID getSubjectFromToken(String token) {
        try {
            DecodedJWT jwt = JWT.decode(token);
            String subject = jwt.getSubject();
            return UUID.fromString(subject);
        } catch (Exception exception) {
            return null;
        }
    }
}
