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
@Table(name = "risk_alerts")
public class RiskAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @Column(name = "alert_type", nullable = false, length = 50)
    private String alertType; // LOW_ADHERENCE, CRITICAL_ADHERENCE, REFILL_URGENT, STREAK_BROKEN

    @Column(name = "severity", nullable = false, length = 20)
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Column(name = "medicine_name", length = 200)
    private String medicineName;

    @Column(name = "metric_value")
    private Double metricValue;

    @Column(name = "threshold_value")
    private Double thresholdValue;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "acknowledged", nullable = false)
    @Builder.Default
    private Boolean acknowledged = false;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
