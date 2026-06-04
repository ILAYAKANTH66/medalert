package com.medalert.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EnvFileEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String PROPERTY_SOURCE_NAME = "dotenvProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> dotenvMap = new HashMap<>();

        // Locate the .env file in the current directory or the backend directory
        Path path = Paths.get(".env");
        if (!Files.exists(path)) {
            path = Paths.get("backend/.env");
        }

        if (Files.exists(path)) {
            System.out.println("[MedAlert-Config] Found .env file at: " + path.toAbsolutePath());
            try {
                List<String> lines = Files.readAllLines(path);
                for (int i = 0; i < lines.size(); i++) {
                    String line = lines.get(i).trim();
                    // Skip empty lines and comment lines
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }

                    int eqIndex = line.indexOf('=');
                    if (eqIndex > 0) {
                        String key = line.substring(0, eqIndex).trim();
                        String value = line.substring(eqIndex + 1).trim();

                        // Strip surrounding single or double quotes
                        if ((value.startsWith("\"") && value.endsWith("\"")) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            if (value.length() >= 2) {
                                value = value.substring(1, value.length() - 1);
                            } else {
                                value = "";
                            }
                        }

                        dotenvMap.put(key, value);
                    } else {
                        System.out.println("[MedAlert-Config] Warning: Malformed line " + (i + 1) + " in .env file: " + line);
                    }
                }
                System.out.println("[MedAlert-Config] Successfully loaded " + dotenvMap.size() + " properties from .env file.");
            } catch (IOException e) {
                System.err.println("[MedAlert-Config] Error reading .env file: " + e.getMessage());
            }
        } else {
            System.out.println("[MedAlert-Config] No .env file found at standard paths (.env or backend/.env). Relying on system environment variables.");
        }

        if (!dotenvMap.isEmpty()) {
            PropertySource<?> propertySource = new MapPropertySource(PROPERTY_SOURCE_NAME, dotenvMap);
            // Use addLast so system variables take precedence over .env file configurations
            environment.getPropertySources().addLast(propertySource);
        }
    }
}
