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
@Table(name = "emergency_events")
public class EmergencyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @Column(name = "triggered_at", nullable = false)
    private LocalDateTime triggeredAt;

    @Column(name = "location_lat")
    private Double locationLat;

    @Column(name = "location_lng")
    private Double locationLng;

    @Column(name = "location_address", length = 500)
    private String locationAddress;

    @Column(name = "alert_sent_to_caretaker", nullable = false)
    @Builder.Default
    private Boolean alertSentToCaretaker = false;

    @Column(name = "voice_call_triggered", nullable = false)
    @Builder.Default
    private Boolean voiceCallTriggered = false;

    @Column(name = "resolved", nullable = false)
    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "notes", length = 1000)
    private String notes;

    @PrePersist
    protected void onCreate() {
        if (triggeredAt == null) triggeredAt = LocalDateTime.now();
    }
}
