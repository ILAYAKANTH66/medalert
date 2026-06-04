package com.medalert.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "twilio")
public class TwilioProperties {
    private String accountSid = "";
    private String authToken = "";
    private String fromNumber = "";
    private boolean enabled = false;
}
