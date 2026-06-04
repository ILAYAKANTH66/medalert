package com.medalert.repository;

import com.medalert.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    List<Medicine> findByUserIdAndIsActiveTrue(Long userId);

    List<Medicine> findByUserId(Long userId);

    @Query("SELECT DISTINCT m FROM Medicine m LEFT JOIN FETCH m.schedules WHERE m.user.id = :userId AND m.isActive = true")
    List<Medicine> findActiveByUserIdWithSchedules(@Param("userId") Long userId);

    @Query("SELECT DISTINCT m FROM Medicine m LEFT JOIN FETCH m.schedules LEFT JOIN FETCH m.user WHERE m.id = :id")
    Optional<Medicine> findByIdWithSchedules(@Param("id") Long id);
}
