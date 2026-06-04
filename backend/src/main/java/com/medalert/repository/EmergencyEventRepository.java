package com.medalert.repository;

import com.medalert.model.EmergencyEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EmergencyEventRepository extends JpaRepository<EmergencyEvent, Long> {

    @Query("SELECT e FROM EmergencyEvent e WHERE e.patient.id = :patientId ORDER BY e.triggeredAt DESC")
    List<EmergencyEvent> findByPatientIdOrderByTriggeredAtDesc(Long patientId);

    @Query("SELECT e FROM EmergencyEvent e WHERE e.patient.id = :patientId AND e.resolved = false ORDER BY e.triggeredAt DESC")
    List<EmergencyEvent> findActiveByPatientId(Long patientId);

    @Query("SELECT e FROM EmergencyEvent e WHERE e.triggeredAt >= :since ORDER BY e.triggeredAt DESC")
    List<EmergencyEvent> findAllSince(LocalDateTime since);

    long countByPatientIdAndTriggeredAtAfter(Long patientId, LocalDateTime since);
}
