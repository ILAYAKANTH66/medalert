package com.medalert.repository;

import com.medalert.model.DoseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DoseLogRepository extends JpaRepository<DoseLog, Long> {
    List<DoseLog> findByMedicineId(Long medicineId);

    List<DoseLog> findByMedicineIdAndDate(Long medicineId, LocalDate date);

    Optional<DoseLog> findByMedicineIdAndDateAndReminderTime(Long medicineId, LocalDate date, LocalTime reminderTime);

    List<DoseLog> findByMedicineUserIdOrderByDateDescReminderTimeDesc(Long userId);

    @Query("""
            SELECT dl FROM DoseLog dl
            JOIN FETCH dl.medicine m
            JOIN m.user u
            WHERE u.id = :userId
            ORDER BY dl.date DESC, dl.reminderTime DESC
            """)
    List<DoseLog> findByUserIdWithMedicine(@Param("userId") Long userId);

    @Query("""
            SELECT dl FROM DoseLog dl
            JOIN FETCH dl.medicine m
            JOIN m.user u
            WHERE u.id = :userId
            ORDER BY dl.date DESC, dl.reminderTime DESC
            """)
    List<DoseLog> findByUserIdWithMedicinePageable(@Param("userId") Long userId, org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT dl FROM DoseLog dl
            JOIN FETCH dl.medicine m
            WHERE dl.medicine.id = :medicineId
            ORDER BY dl.date DESC, dl.reminderTime DESC
            """)
    List<DoseLog> findByMedicineIdWithMedicine(@Param("medicineId") Long medicineId);

    @Query("""
            SELECT dl FROM DoseLog dl
            JOIN FETCH dl.medicine m
            WHERE dl.medicine.id = :medicineId
            ORDER BY dl.date DESC, dl.reminderTime DESC
            """)
    List<DoseLog> findByMedicineIdWithMedicinePageable(@Param("medicineId") Long medicineId, org.springframework.data.domain.Pageable pageable);

    @Query("""
            SELECT dl FROM DoseLog dl
            JOIN FETCH dl.medicine m
            WHERE dl.medicine.id IN :medicineIds
              AND dl.date BETWEEN :startDate AND :endDate
            """)
    List<DoseLog> findByMedicineIdsAndDateBetween(
            @Param("medicineIds") List<Long> medicineIds,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
