package com.medalert.repository;

import com.medalert.model.RiskAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskAlertRepository extends JpaRepository<RiskAlert, Long> {

    @Query("SELECT r FROM RiskAlert r WHERE r.patient.id = :patientId ORDER BY r.createdAt DESC")
    List<RiskAlert> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    @Query("SELECT r FROM RiskAlert r WHERE r.patient.id = :patientId AND r.acknowledged = false ORDER BY r.createdAt DESC")
    List<RiskAlert> findUnacknowledgedByPatientId(Long patientId);

    @Query("SELECT r FROM RiskAlert r WHERE r.patient.id = :patientId ORDER BY r.createdAt DESC")
    List<RiskAlert> findTop10ByPatientIdOrderByCreatedAtDesc(Long patientId);
}
