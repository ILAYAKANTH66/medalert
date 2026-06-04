package com.medalert.service;

import com.medalert.model.DoseLog;
import com.medalert.model.DoseStatus;
import com.medalert.model.Medicine;
import com.medalert.model.Schedule;
import com.medalert.model.User;
import com.medalert.repository.DoseLogRepository;
import com.medalert.repository.MedicineRepository;
import com.medalert.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final UserRepository userRepository;
    private final MedicineRepository medicineRepository;
    private final DoseLogRepository doseLogRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getAnalytics(String email, String period) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDate today = LocalDate.now();
        int days = "monthly".equalsIgnoreCase(period) ? 30 : 7;
        LocalDate startDate = today.minusDays(days - 1);

        List<Medicine> medicines = medicineRepository.findActiveByUserIdWithSchedules(user.getId());
        if (medicines == null) medicines = Collections.emptyList();

        List<Long> medicineIds = medicines.stream().map(Medicine::getId).collect(Collectors.toList());

        List<DoseLog> logs = medicineIds.isEmpty()
                ? Collections.emptyList()
                : doseLogRepository.findByMedicineIdsAndDateBetween(medicineIds, startDate, today);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d");
        List<Map<String, Object>> dailyAdherence = new ArrayList<>();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            int expected = 0;
            int taken = 0;
            int skipped = 0;
            int missed = 0;

            for (Medicine med : medicines) {
                if (!isMedicineActiveOnDate(med, day)) continue;
                List<Schedule> schedules = med.getSchedules() != null ? med.getSchedules() : Collections.emptyList();
                expected += schedules.size();

                for (Schedule s : schedules) {
                    final LocalDate finalDay = day;
                    Optional<DoseLog> logOpt = logs.stream()
                            .filter(l -> l.getMedicine().getId().equals(med.getId())
                                    && l.getDate().equals(finalDay)
                                    && s.getReminderTime() != null
                                    && s.getReminderTime().equals(l.getReminderTime()))
                            .findFirst();
                    if (logOpt.isPresent()) {
                        DoseStatus status = logOpt.get().getStatus();
                        if (status == DoseStatus.TAKEN) taken++;
                        else if (status == DoseStatus.SKIPPED) skipped++;
                        else missed++;
                    } else if (day.isBefore(today)) {
                        missed++;
                    }
                }
            }

            double pct = expected == 0 ? 0.0 : Math.round((double) taken / expected * 1000.0) / 10.0;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", day.toString());
            entry.put("label", day.format(fmt));
            entry.put("expected", expected);
            entry.put("taken", taken);
            entry.put("skipped", skipped);
            entry.put("missed", missed);
            entry.put("adherencePercentage", pct);
            dailyAdherence.add(entry);
        }

        // Per-medicine stats
        List<Map<String, Object>> medicineStats = new ArrayList<>();
        for (Medicine med : medicines) {
            List<DoseLog> medLogs = logs.stream()
                    .filter(l -> l.getMedicine().getId().equals(med.getId()))
                    .collect(Collectors.toList());

            long takenCount = medLogs.stream().filter(l -> l.getStatus() == DoseStatus.TAKEN).count();
            long skippedCount = medLogs.stream().filter(l -> l.getStatus() == DoseStatus.SKIPPED).count();
            long missedCount = medLogs.stream().filter(l -> l.getStatus() == DoseStatus.MISSED).count();

            int expectedForMed = 0;
            for (int i = days - 1; i >= 0; i--) {
                LocalDate day = today.minusDays(i);
                if (isMedicineActiveOnDate(med, day)) {
                    expectedForMed += med.getSchedules() != null ? med.getSchedules().size() : 0;
                }
            }

            double pct = expectedForMed == 0 ? 0.0 : Math.round((double) takenCount / expectedForMed * 1000.0) / 10.0;

            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("medicineId", med.getId());
            stat.put("medicineName", med.getMedicineName());
            stat.put("dosage", med.getDosage());
            stat.put("taken", takenCount);
            stat.put("skipped", skippedCount);
            stat.put("missed", missedCount);
            stat.put("expected", expectedForMed);
            stat.put("adherencePercentage", pct);
            medicineStats.add(stat);
        }

        long totalTaken = logs.stream().filter(l -> l.getStatus() == DoseStatus.TAKEN).count();
        long totalSkipped = logs.stream().filter(l -> l.getStatus() == DoseStatus.SKIPPED).count();
        long totalMissed = logs.stream().filter(l -> l.getStatus() == DoseStatus.MISSED).count();
        long totalExpected = dailyAdherence.stream().mapToLong(e -> ((Number) e.get("expected")).longValue()).sum();
        double overallAdherence = totalExpected == 0 ? 0.0 : Math.round((double) totalTaken / totalExpected * 1000.0) / 10.0;

        Optional<Map<String, Object>> bestDay = dailyAdherence.stream()
                .filter(e -> ((Number) e.get("expected")).intValue() > 0)
                .max(Comparator.comparingDouble(e -> ((Number) e.get("adherencePercentage")).doubleValue()));
        Optional<Map<String, Object>> worstDay = dailyAdherence.stream()
                .filter(e -> ((Number) e.get("expected")).intValue() > 0)
                .min(Comparator.comparingDouble(e -> ((Number) e.get("adherencePercentage")).doubleValue()));

        // Current streak: consecutive days with 100% adherence ending today
        int currentStreak = 0;
        for (int i = 0; i < days; i++) {
            LocalDate day = today.minusDays(i);
            String dayStr = day.toString();
            Map<String, Object> dayEntry = dailyAdherence.stream()
                    .filter(e -> e.get("date").equals(dayStr))
                    .findFirst().orElse(null);
            if (dayEntry == null) break;
            int exp = ((Number) dayEntry.get("expected")).intValue();
            double pct = ((Number) dayEntry.get("adherencePercentage")).doubleValue();
            if (exp == 0 || pct >= 100.0) currentStreak++;
            else break;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("period", period);
        result.put("days", days);
        result.put("startDate", startDate.toString());
        result.put("endDate", today.toString());
        result.put("overallAdherence", overallAdherence);
        result.put("totalTaken", totalTaken);
        result.put("totalSkipped", totalSkipped);
        result.put("totalMissed", totalMissed);
        result.put("totalExpected", totalExpected);
        result.put("currentStreak", currentStreak);
        result.put("bestDay", bestDay.map(d -> d.get("label")).orElse(null));
        result.put("worstDay", worstDay.map(d -> d.get("label")).orElse(null));
        result.put("dailyAdherence", dailyAdherence);
        result.put("medicineStats", medicineStats);
        return result;
    }

    private boolean isMedicineActiveOnDate(Medicine med, LocalDate day) {
        return Boolean.TRUE.equals(med.getIsActive())
                && (med.getStartDate() == null || !med.getStartDate().isAfter(day))
                && (med.getEndDate() == null || !med.getEndDate().isBefore(day));
    }
}
