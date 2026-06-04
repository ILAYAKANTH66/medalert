package com.medalert.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_preferences")
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "browser_notifications_enabled", nullable = false)
    @Builder.Default
    private Boolean browserNotificationsEnabled = true;

    @Column(name = "voice_escalation_enabled", nullable = false)
    @Builder.Default
    private Boolean voiceEscalationEnabled = false;

    @Column(name = "silent_mode", nullable = false)
    @Builder.Default
    private Boolean silentMode = false;

    @Column(name = "escalation_delay_minutes", nullable = false)
    @Builder.Default
    private Integer escalationDelayMinutes = 5;

    @Column(name = "voice_escalation_delay_minutes", nullable = false)
    @Builder.Default
    private Integer voiceEscalationDelayMinutes = 5;

    @Column(name = "reminder_frequency_minutes", nullable = false)
    @Builder.Default
    private Integer reminderFrequencyMinutes = 1;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "voice_provider", nullable = false)
    @Builder.Default
    private String voiceProvider = "TWILIO";

    @Column(name = "max_voice_call_attempts", nullable = false)
    @Builder.Default
    private Integer maxVoiceCallAttempts = 1;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }

    public static UserPreferences defaultsFor(User user) {
        return UserPreferences.builder()
                .user(user)
                .browserNotificationsEnabled(true)
                .voiceEscalationEnabled(false)
                .silentMode(false)
                .escalationDelayMinutes(5)
                .voiceEscalationDelayMinutes(5)
                .reminderFrequencyMinutes(1)
                .voiceProvider("TWILIO")
                .maxVoiceCallAttempts(1)
                .build();
    }
}
