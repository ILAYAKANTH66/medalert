package com.medalert.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "dose_logs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"medicine_id", "date", "reminder_time"})
}, indexes = {
    @Index(name = "idx_dose_lookup", columnList = "medicine_id, date, reminder_time")
})
public class DoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "reminder_time", nullable = false)
    private LocalTime reminderTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DoseStatus status;

    @Column(name = "taken_time")
    private LocalTime takenTime;
}

