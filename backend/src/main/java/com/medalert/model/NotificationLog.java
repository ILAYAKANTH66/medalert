package com.medalert.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notification_logs", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "medicine_id", "reminder_date", "reminder_time"})
}, indexes = {
        @Index(name = "idx_notif_pending_l2", columnList = "user_id, acknowledged, notification_sent, second_notification_sent"),
        @Index(name = "idx_notif_pending_voice", columnList = "acknowledged, second_notification_sent, voice_call_sent")
})
public class NotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "medicine_id", nullable = false)
    private Long medicineId;

    @Column(name = "medicine_name")
    private String medicineName;

    @Column(name = "dosage")
    private String dosage;

    @Column(name = "reminder_date", nullable = false)
    private LocalDate reminderDate;

    @Column(name = "reminder_time", nullable = false)
    private LocalTime reminderTime;

    @Column(name = "notification_sent", nullable = false)
    @Builder.Default
    private Boolean notificationSent = false;

    @Column(name = "second_notification_sent", nullable = false)
    @Builder.Default
    private Boolean secondNotificationSent = false;

    @Column(name = "voice_call_sent", nullable = false)
    @Builder.Default
    private Boolean voiceCallSent = false;

    @Column(name = "acknowledged", nullable = false)
    @Builder.Default
    private Boolean acknowledged = false;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "level1_sent_at")
    private LocalDateTime level1SentAt;

    @Column(name = "level2_sent_at")
    private LocalDateTime level2SentAt;

    @Column(name = "voice_call_sent_at")
    private LocalDateTime voiceCallSentAt;

    @Column(name = "call_sid")
    private String callSid;

    @Column(name = "voice_call_attempts", nullable = false)
    @Builder.Default
    private Integer voiceCallAttempts = 0;

    @Column(name = "last_voice_attempt_at")
    private LocalDateTime lastVoiceAttemptAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
