package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferencesDto {
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
