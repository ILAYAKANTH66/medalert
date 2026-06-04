package com.medalert.service;

import com.medalert.dto.NotificationAcknowledgeRequest;
import com.medalert.dto.NotificationEventRequest;
import com.medalert.dto.NotificationLogDto;
import com.medalert.dto.PendingNotificationActionDto;
import com.medalert.model.NotificationLog;
import com.medalert.model.Role;
import com.medalert.model.User;
import com.medalert.model.UserPreferences;
import com.medalert.repository.DoseLogRepository;
import com.medalert.repository.NotificationLogRepository;
import com.medalert.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEscalationService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationLogRepository notificationLogRepository;
    private final UserRepository userRepository;
    private final UserPreferencesService userPreferencesService;
    private final VoiceCallService voiceCallService;
    private final DoseLogRepository doseLogRepository;

    @Transactional
    public NotificationLogDto registerLevel1(String userEmail, NotificationEventRequest request) {
        try {
            User user = requirePatient(userEmail);
            UserPreferences prefs = userPreferencesService.getOrCreatePreferencesEntity(user.getId());
            if (Boolean.TRUE.equals(prefs.getSilentMode())) {
                return emptyDto();
            }

            LocalDate date = parseDate(request.getReminderDate());
            LocalTime time = parseTime(request.getReminderTime());
            if (date == null || time == null || request.getMedicineId() == null) {
                return emptyDto();
            }

            if (isDoseAlreadyLogged(request.getMedicineId(), date, time)) {
                return acknowledgeInternal(user.getId(), request.getMedicineId(), date, time);
            }

            NotificationLog log = findOrCreateLog(user.getId(), request, date, time);
            if (!Boolean.TRUE.equals(log.getNotificationSent())) {
                log.setNotificationSent(true);
                log.setLevel1SentAt(LocalDateTime.now());
            }
            return mapToDto(notificationLogRepository.save(log));
        } catch (Exception ex) {
            log.warn("[Escalation] registerLevel1 failed: {}", ex.getMessage());
            return emptyDto();
        }
    }

    @Transactional
    public NotificationLogDto markLevel2Sent(String userEmail, NotificationEventRequest request) {
        try {
            User user = requirePatient(userEmail);
            LocalDate date = parseDate(request.getReminderDate());
            LocalTime time = parseTime(request.getReminderTime());
            if (date == null || time == null || request.getMedicineId() == null) {
                return emptyDto();
            }

            NotificationLog log = notificationLogRepository
                    .findByUserIdAndMedicineIdAndReminderDateAndReminderTime(
                            user.getId(), request.getMedicineId(), date, time)
                    .orElseGet(() -> findOrCreateLog(user.getId(), request, date, time));

            if (!Boolean.TRUE.equals(log.getSecondNotificationSent())) {
                log.setSecondNotificationSent(true);
                log.setLevel2SentAt(LocalDateTime.now());
            }
            return mapToDto(notificationLogRepository.save(log));
        } catch (Exception ex) {
            log.warn("[Escalation] markLevel2 failed: {}", ex.getMessage());
            return emptyDto();
        }
    }

    @Transactional
    public NotificationLogDto acknowledge(String userEmail, NotificationAcknowledgeRequest request) {
        try {
            User user = requirePatient(userEmail);
            LocalDate date = parseDate(request.getReminderDate());
            LocalTime time = parseTime(request.getReminderTime());
            if (date == null || time == null || request.getMedicineId() == null) {
                return emptyDto();
            }
            return acknowledgeInternal(user.getId(), request.getMedicineId(), date, time);
        } catch (Exception ex) {
            log.warn("[Escalation] acknowledge failed: {}", ex.getMessage());
            return emptyDto();
        }
    }

    @Transactional(readOnly = true)
    public List<PendingNotificationActionDto> getPendingClientActions(String userEmail) {
        try {
            User user = requirePatient(userEmail);
            UserPreferences prefs = userPreferencesService.getOrCreatePreferencesEntity(user.getId());
            if (Boolean.TRUE.equals(prefs.getSilentMode())
                    || !Boolean.TRUE.equals(prefs.getBrowserNotificationsEnabled())) {
                return Collections.emptyList();
            }

            int delayMinutes = prefs.getEscalationDelayMinutes() != null ? prefs.getEscalationDelayMinutes() : 5;
            LocalDateTime now = LocalDateTime.now();
            List<PendingNotificationActionDto> actions = new ArrayList<>();

            for (NotificationLog entry : notificationLogRepository.findPendingLevel2(user.getId())) {
                if (isDoseAlreadyLogged(entry.getMedicineId(), entry.getReminderDate(), entry.getReminderTime())) {
                    continue;
                }
                if (entry.getLevel1SentAt() == null
                        || entry.getLevel1SentAt().plusMinutes(delayMinutes).isAfter(now)) {
                    continue;
                }
                actions.add(PendingNotificationActionDto.builder()
                        .actionType("LEVEL2_PUSH")
                        .medicineId(entry.getMedicineId())
                        .medicineName(safeString(entry.getMedicineName()))
                        .dosage(safeString(entry.getDosage()))
                        .reminderDate(entry.getReminderDate().toString())
                        .reminderTime(entry.getReminderTime().format(TIME_FMT))
                        .build());
            }
            return actions;
        } catch (Exception ex) {
            log.warn("[Escalation] getPendingClientActions failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Transactional
    public void processVoiceEscalation(NotificationLog notificationLog) {
        if (Boolean.TRUE.equals(notificationLog.getAcknowledged())) {
            return;
        }
        if (isDoseAlreadyLogged(notificationLog.getMedicineId(),
                notificationLog.getReminderDate(), notificationLog.getReminderTime())) {
            acknowledgeInternal(notificationLog.getUserId(), notificationLog.getMedicineId(),
                    notificationLog.getReminderDate(), notificationLog.getReminderTime());
            return;
        }

        UserPreferences prefs = userPreferencesService.getOrCreatePreferencesEntity(notificationLog.getUserId());
        if (!Boolean.TRUE.equals(prefs.getVoiceEscalationEnabled())
                || Boolean.TRUE.equals(prefs.getSilentMode())
                || prefs.getPhoneNumber() == null
                || prefs.getPhoneNumber().isBlank()) {
            return;
        }
        if (notificationLog.getLevel2SentAt() == null) {
            return;
        }

        int voiceDelay = prefs.getVoiceEscalationDelayMinutes() != null ? prefs.getVoiceEscalationDelayMinutes() : 5;
        if (notificationLog.getLevel2SentAt().plusMinutes(voiceDelay).isAfter(LocalDateTime.now())) {
            return;
        }

        int maxAttempts = prefs.getMaxVoiceCallAttempts() != null ? prefs.getMaxVoiceCallAttempts() : 1;
        int attempts = notificationLog.getVoiceCallAttempts() != null ? notificationLog.getVoiceCallAttempts() : 0;

        if (Boolean.TRUE.equals(notificationLog.getVoiceCallSent())) {
            return;
        }

        if (attempts >= maxAttempts) {
            notificationLog.setVoiceCallSent(true);
            notificationLogRepository.save(notificationLog);
            return;
        }

        if (notificationLog.getLastVoiceAttemptAt() != null
                && notificationLog.getLastVoiceAttemptAt().plusMinutes(voiceDelay).isAfter(LocalDateTime.now())) {
            return;
        }

        // --- Rate Limiting Guards ---
        // Cooldown rate limit check: minimum 5 minutes between calls for this user
        LocalDateTime lastGlobalCall = notificationLogRepository.findLastVoiceAttemptTimeForUser(notificationLog.getUserId());
        if (lastGlobalCall != null && lastGlobalCall.plusMinutes(5).isAfter(LocalDateTime.now())) {
            log.debug("[Escalation] Cooldown protection — skipping voice call tick for user {}", notificationLog.getUserId());
            return;
        }

        // Daily limit check: maximum 10 voice calls per user per day
        LocalDateTime sinceToday = LocalDate.now().atStartOfDay();
        long dailyCallCount = notificationLogRepository.countVoiceCallsSentForUserSince(notificationLog.getUserId(), sinceToday);
        if (dailyCallCount >= 10) {
            log.warn("[Escalation] Daily limit reached — user {} has already received {} calls today", notificationLog.getUserId(), dailyCallCount);
            return;
        }

        // Fetch dynamic names
        String patientName = userRepository.findById(notificationLog.getUserId())
                .map(User::getName)
                .orElse("Patient");
        String medicineName = notificationLog.getMedicineName() != null ? notificationLog.getMedicineName() : "scheduled medicine";

        notificationLog.setVoiceCallAttempts(attempts + 1);
        notificationLog.setLastVoiceAttemptAt(LocalDateTime.now());
        notificationLog.setVoiceCallSent(true);
        notificationLog.setVoiceCallSentAt(LocalDateTime.now());
        notificationLogRepository.save(notificationLog);

        try {
            final Long logId = notificationLog.getId();
            voiceCallService.initiateMedicineReminderCall(
                    prefs.getPhoneNumber(),
                    patientName,
                    medicineName,
                    prefs.getVoiceProvider() != null ? prefs.getVoiceProvider() : "TWILIO"
            ).thenAccept(callSid -> {
                log.info("[Escalation] Voice call completed for log {}. callSid={}", logId, callSid);
                notificationLogRepository.findById(logId).ifPresent(l -> {
                    l.setCallSid(callSid);
                    notificationLogRepository.save(l);
                });
            }).exceptionally(ex -> {
                log.error("[Escalation] Async voice call failed for log {}", logId, ex);
                return null;
            });
        } catch (Exception ex) {
            log.error("[Escalation] Voice call trigger failed for log {}", notificationLog.getId(), ex);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationLogDto> getRecentLogs(String userEmail) {
        try {
            User user = requirePatient(userEmail);
            return notificationLogRepository.findTop20ByUserIdOrderByCreatedAtDesc(user.getId())
                    .stream()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            log.warn("[Escalation] getRecentLogs failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    private NotificationLog findOrCreateLog(Long userId, NotificationEventRequest request,
                                            LocalDate date, LocalTime time) {
        return notificationLogRepository
                .findByUserIdAndMedicineIdAndReminderDateAndReminderTime(userId, request.getMedicineId(), date, time)
                .orElseGet(() -> NotificationLog.builder()
                        .userId(userId)
                        .medicineId(request.getMedicineId())
                        .medicineName(safeString(request.getMedicineName()))
                        .dosage(safeString(request.getDosage()))
                        .reminderDate(date)
                        .reminderTime(time)
                        .build());
    }

    private NotificationLogDto acknowledgeInternal(Long userId, Long medicineId, LocalDate date, LocalTime time) {
        return notificationLogRepository
                .findByUserIdAndMedicineIdAndReminderDateAndReminderTime(userId, medicineId, date, time)
                .map(log -> {
                    log.setAcknowledged(true);
                    log.setAcknowledgedAt(LocalDateTime.now());
                    return mapToDto(notificationLogRepository.save(log));
                })
                .orElse(emptyDto());
    }

    private boolean isDoseAlreadyLogged(Long medicineId, LocalDate date, LocalTime time) {
        return doseLogRepository.findByMedicineIdAndDateAndReminderTime(medicineId, date, time).isPresent();
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return LocalDate.now();
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException e) {
            return LocalDate.now();
        }
    }

    private LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String t = raw.trim();
            if (t.length() > 5) t = t.substring(0, 5);
            return LocalTime.parse(t, TIME_FMT);
        } catch (DateTimeParseException e) {
            try {
                return LocalTime.parse(raw.trim());
            } catch (DateTimeParseException e2) {
                return null;
            }
        }
    }

    private String safeString(String s) {
        return s != null ? s : "";
    }

    private NotificationLogDto emptyDto() {
        return NotificationLogDto.builder()
                .notificationSent(false)
                .secondNotificationSent(false)
                .voiceCallSent(false)
                .acknowledged(false)
                .voiceCallAttempts(0)
                .build();
    }

    private User requirePatient(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers cannot access patient notification controls.");
        }
        return user;
    }

    private NotificationLogDto mapToDto(NotificationLog log) {
        if (log == null) return emptyDto();
        return NotificationLogDto.builder()
                .id(log.getId())
                .medicineId(log.getMedicineId())
                .medicineName(log.getMedicineName())
                .reminderDate(log.getReminderDate().toString())
                .reminderTime(log.getReminderTime().format(TIME_FMT))
                .notificationSent(Boolean.TRUE.equals(log.getNotificationSent()))
                .secondNotificationSent(Boolean.TRUE.equals(log.getSecondNotificationSent()))
                .voiceCallSent(Boolean.TRUE.equals(log.getVoiceCallSent()))
                .acknowledged(Boolean.TRUE.equals(log.getAcknowledged()))
                .acknowledgedAt(log.getAcknowledgedAt() != null ? log.getAcknowledgedAt().toString() : null)
                .voiceCallAttempts(log.getVoiceCallAttempts() != null ? log.getVoiceCallAttempts() : 0)
                .build();
    }
}
