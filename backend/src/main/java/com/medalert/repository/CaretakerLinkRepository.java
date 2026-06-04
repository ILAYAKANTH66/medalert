package com.medalert.repository;

import com.medalert.model.CaretakerLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaretakerLinkRepository extends JpaRepository<CaretakerLink, Long> {
    List<CaretakerLink> findByCaretakerId(Long caretakerId);

    List<CaretakerLink> findByPatientId(Long patientId);

    Optional<CaretakerLink> findByPatientIdAndCaretakerId(Long patientId, Long caretakerId);

    @Query("SELECT cl FROM CaretakerLink cl JOIN FETCH cl.patient WHERE cl.caretaker.id = :caretakerId")
    List<CaretakerLink> findByCaretakerIdWithPatient(@Param("caretakerId") Long caretakerId);

    @Query("SELECT cl FROM CaretakerLink cl JOIN FETCH cl.caretaker WHERE cl.patient.id = :patientId")
    List<CaretakerLink> findByPatientIdWithCaretaker(@Param("patientId") Long patientId);

    @Query("SELECT cl FROM CaretakerLink cl JOIN FETCH cl.caretaker JOIN FETCH cl.patient WHERE cl.patient.id = :patientId AND cl.caretaker.id = :caretakerId")
    Optional<CaretakerLink> findByPatientIdAndCaretakerIdWithUsers(
            @Param("patientId") Long patientId,
            @Param("caretakerId") Long caretakerId
    );
}
