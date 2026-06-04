package com.medalert.repository;

import com.medalert.model.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {

    Optional<NotificationLog> findByUserIdAndMedicineIdAndReminderDateAndReminderTime(
            Long userId, Long medicineId, LocalDate reminderDate, LocalTime reminderTime
    );

    @Query("""
            SELECT n FROM NotificationLog n
            WHERE n.userId = :userId
              AND n.acknowledged = false
              AND n.notificationSent = true
              AND n.secondNotificationSent = false
            """)
    List<NotificationLog> findPendingLevel2(@Param("userId") Long userId);

    @Query("""
            SELECT n FROM NotificationLog n
            WHERE n.acknowledged = false
              AND n.secondNotificationSent = true
              AND n.voiceCallSent = false
            """)
    List<NotificationLog> findPendingVoiceCalls();

    List<NotificationLog> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            SELECT COUNT(n) FROM NotificationLog n
            WHERE n.userId = :userId
              AND n.voiceCallSent = true
              AND n.voiceCallSentAt >= :since
            """)
    long countVoiceCallsSentForUserSince(@Param("userId") Long userId, @Param("since") java.time.LocalDateTime since);

    @Query("""
            SELECT MAX(n.lastVoiceAttemptAt) FROM NotificationLog n
            WHERE n.userId = :userId
            """)
    java.time.LocalDateTime findLastVoiceAttemptTimeForUser(@Param("userId") Long userId);
}
