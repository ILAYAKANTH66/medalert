package com.medalert.dto;

import lombok.Data;

@Data
public class UserPreferencesRequest {
    private Boolean browserNotificationsEnabled;
    private Boolean voiceEscalationEnabled;
    private Boolean silentMode;
    private Integer escalationDelayMinutes;
    private Integer voiceEscalationDelayMinutes;
    private Integer reminderFrequencyMinutes;
    private String phoneNumber;
    private String voiceProvider;
    private Integer maxVoiceCallAttempts;
}
