package com.medalert.service;

import com.medalert.model.*;
import com.medalert.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiskMonitoringService {

    private final UserRepository userRepository;
    private final MedicineRepository medicineRepository;
    private final DoseLogRepository doseLogRepository;
    private final RiskAlertRepository riskAlertRepository;

    @Scheduled(fixedDelay = 3600000)
    @Transactional
    public void runRiskAnalysis() {
        log.info("[RiskMonitoring] Running scheduled risk analysis");
        List<User> patients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.PATIENT)
                .collect(Collectors.toList());

        for (User patient : patients) {
            try {
                analyzePatientRisks(patient);
            } catch (Exception e) {
                log.error("[RiskMonitoring] Error analyzing patient {}", patient.getEmail(), e);
            }
        }
    }

    @Transactional
    public List<RiskAlert> analyzePatientRisks(User patient) {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(7);

        List<Medicine> medicines = medicineRepository.findActiveByUserIdWithSchedules(patient.getId());
        if (medicines == null || medicines.isEmpty()) return Collections.emptyList();

        List<Long> medIds = medicines.stream().map(Medicine::getId).collect(Collectors.toList());
        List<DoseLog> recentLogs = doseLogRepository.findByMedicineIdsAndDateBetween(medIds, sevenDaysAgo, today);

        int totalExpected = 0;
        int totalTaken = 0;

        for (Medicine med : medicines) {
            for (int i = 0; i <= 7; i++) {
                LocalDate day = today.minusDays(i);
                if (!isMedicineActiveOnDate(med, day)) continue;
                int schedCount = med.getSchedules() != null ? med.getSchedules().size() : 0;
                totalExpected += schedCount;

                final LocalDate finalDay = day;
                long taken = recentLogs.stream()
                        .filter(l -> l.getMedicine().getId().equals(med.getId())
                                && l.getDate().equals(finalDay)
                                && l.getStatus() == DoseStatus.TAKEN)
                        .count();
                totalTaken += (int) taken;
            }
        }

        double adherence = totalExpected == 0 ? 100.0 : (double) totalTaken / totalExpected * 100.0;
        List<RiskAlert> newAlerts = new ArrayList<>();

        if (adherence < 70.0 && adherence >= 50.0) {
            newAlerts.add(createAlert(patient, "LOW_ADHERENCE", "MEDIUM",
                    String.format("Your 7-day adherence is %.0f%% — below the 70%% target.", adherence),
                    null, adherence, 70.0));
        }

        if (adherence < 50.0) {
            newAlerts.add(createAlert(patient, "CRITICAL_ADHERENCE", "CRITICAL",
                    String.format("CRITICAL: Your 7-day adherence is only %.0f%% — immediate attention needed!", adherence),
                    null, adherence, 50.0));
        }

        for (Medicine med : medicines) {
            if (med.getStockCount() != null && med.getStockCount() < 7) {
                newAlerts.add(createAlert(patient, "REFILL_URGENT", "HIGH",
                        String.format("%s has only %d doses remaining. Refill urgently.", med.getMedicineName(), med.getStockCount()),
                        med.getMedicineName(), (double) med.getStockCount(), 7.0));
            }
        }

        List<RiskAlert> existingToday = riskAlertRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId())
                .stream()
                .filter(a -> a.getCreatedAt() != null && a.getCreatedAt().toLocalDate().equals(today))
                .collect(Collectors.toList());

        List<RiskAlert> saved = new ArrayList<>();
        for (RiskAlert alert : newAlerts) {
            boolean duplicate = existingToday.stream()
                    .anyMatch(e -> e.getAlertType().equals(alert.getAlertType())
                            && Objects.equals(e.getMedicineName(), alert.getMedicineName()));
            if (!duplicate) {
                saved.add(riskAlertRepository.save(alert));
                log.info("[RiskMonitoring] Created {} alert for {}", alert.getAlertType(), patient.getEmail());
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<RiskAlert> getPatientAlerts(String email) {
        User patient = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return riskAlertRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId())
                .stream().limit(20).collect(Collectors.toList());
    }

    @Transactional
    public RiskAlert acknowledgeAlert(Long alertId, String email) {
        RiskAlert alert = riskAlertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        if (!alert.getPatient().getEmail().equals(email)) throw new RuntimeException("Unauthorized");
        alert.setAcknowledged(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        return riskAlertRepository.save(alert);
    }

    private RiskAlert createAlert(User patient, String type, String severity, String message,
                                   String medicineName, Double metricValue, Double threshold) {
        return RiskAlert.builder()
                .patient(patient)
                .alertType(type)
                .severity(severity)
                .message(message)
                .medicineName(medicineName)
                .metricValue(metricValue)
                .thresholdValue(threshold)
                .build();
    }

    private boolean isMedicineActiveOnDate(Medicine med, LocalDate day) {
        return Boolean.TRUE.equals(med.getIsActive())
                && (med.getStartDate() == null || !med.getStartDate().isAfter(day))
                && (med.getEndDate() == null || !med.getEndDate().isBefore(day));
    }
}
