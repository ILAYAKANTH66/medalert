package com.medalert.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StartupValidator implements CommandLineRunner {

    private final Environment env;
    private final TwilioProperties twilioProperties;

    @Override
    public void run(String... args) throws Exception {
        log.info("[MedAlert-Validation] Running backend startup configuration validation...");

        // 1. Database Configuration Checks
        String dbUrl = env.getProperty("spring.datasource.url");
        String dbUsername = env.getProperty("spring.datasource.username");

        if (dbUrl == null || dbUrl.isBlank()) {
            log.error("[MedAlert-Validation] Missing database URL configuration (spring.datasource.url)!");
            throw new IllegalStateException("Database URL is required. Please set DB_URL in your .env file or environment.");
        }
        if (dbUsername == null || dbUsername.isBlank()) {
            log.error("[MedAlert-Validation] Missing database username configuration (spring.datasource.username)!");
            throw new IllegalStateException("Database username is required. Please set DB_USERNAME in your .env file or environment.");
        }
        log.info("[MedAlert-Validation] Database configuration found: URL='{}', Username='{}'", dbUrl, dbUsername);

        // 2. JWT Configuration Checks
        String jwtSecret = env.getProperty("jwt.secret");

        if (jwtSecret == null || jwtSecret.isBlank()) {
            log.error("[MedAlert-Validation] Missing JWT secret key configuration (jwt.secret)!");
            throw new IllegalStateException("JWT Secret is required. Please set JWT_SECRET in your .env file or environment.");
        }
        if (jwtSecret.length() < 32) {
            log.warn("[MedAlert-Validation] JWT secret key is short (less than 32 characters). Consider using a stronger key in production!");
        }
        log.info("[MedAlert-Validation] JWT configuration loaded successfully.");

        // 3. Twilio Configuration Checks
        boolean twilioEnabled = twilioProperties.isEnabled();
        if (twilioEnabled) {
            String sid = twilioProperties.getAccountSid();
            String token = twilioProperties.getAuthToken();
            String from = twilioProperties.getFromNumber();

            if (sid == null || sid.isBlank()) {
                log.error("[MedAlert-Validation] Twilio is enabled, but Account SID is missing!");
                throw new IllegalStateException("Twilio Account SID is required when TWILIO_ENABLED is true.");
            }
            if (token == null || token.isBlank()) {
                log.error("[MedAlert-Validation] Twilio is enabled, but Auth Token is missing!");
                throw new IllegalStateException("Twilio Auth Token is required when TWILIO_ENABLED is true.");
            }
            if (from == null || from.isBlank()) {
                log.error("[MedAlert-Validation] Twilio is enabled, but From Number is missing!");
                throw new IllegalStateException("Twilio From Number is required when TWILIO_ENABLED is true.");
            }
            log.info("[MedAlert-Validation] Twilio is ENABLED. Account SID='{}', From Number='{}'", sid, from);
        } else {
            log.info("[MedAlert-Validation] Twilio is DISABLED. Real voice calls will be simulated in demo/simulation mode.");
        }

        // 4. CORS Checks
        String corsAllowed = env.getProperty("app.cors.allowed-origins");
        log.info("[MedAlert-Validation] CORS Allowed Origins configured: '{}'", corsAllowed);

        log.info("[MedAlert-Validation] Startup configuration validation passed successfully.");
    }
}
