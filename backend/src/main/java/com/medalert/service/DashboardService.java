package com.medalert.service;

import com.medalert.dto.AdherenceMetric;
import com.medalert.dto.DashboardSummary;
import com.medalert.dto.DoseLogResponse;
import com.medalert.dto.DoseTimelineItem;
import com.medalert.dto.MedicineResponse;
import com.medalert.model.DoseLog;
import com.medalert.model.DoseStatus;
import com.medalert.model.Medicine;
import com.medalert.model.Schedule;
import com.medalert.model.User;
import com.medalert.repository.DoseLogRepository;
import com.medalert.repository.MedicineRepository;
import com.medalert.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final MedicineRepository medicineRepository;
    private final DoseLogRepository doseLogRepository;
    private final UserRepository userRepository;
    private final MedicineService medicineService;

    @Transactional(readOnly = true)
    public DashboardSummary getPatientDashboard(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Medicine> rawMedicines = medicineRepository.findActiveByUserIdWithSchedules(user.getId());
        if (rawMedicines == null) {
            rawMedicines = Collections.emptyList();
        }

        List<MedicineResponse> activeMedicines = rawMedicines.stream()
                .map(medicineService::mapToResponse)
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<DoseTimelineItem> todayTimeline = new ArrayList<>();
        for (Medicine med : rawMedicines) {
            if (!isMedicineActiveOnDate(med, today)) {
                continue;
            }

            List<Schedule> schedules = safeSchedules(med);
            for (Schedule s : schedules) {
                if (s.getReminderTime() == null) {
                    continue;
                }

                Optional<DoseLog> logOpt = doseLogRepository.findByMedicineIdAndDateAndReminderTime(
                        med.getId(), today, s.getReminderTime()
                );

                String status;
                String takenTime = null;

                if (logOpt.isPresent()) {
                    DoseLog log = logOpt.get();
                    status = log.getStatus() != null ? log.getStatus().name() : "UPCOMING";
                    takenTime = formatTime(log.getTakenTime());
                } else if (now.isAfter(s.getReminderTime().plusMinutes(60))) {
                    status = "MISSED";
                } else {
                    status = "UPCOMING";
                }

                todayTimeline.add(DoseTimelineItem.builder()
                        .medicineId(med.getId())
                        .medicineName(med.getMedicineName())
                        .dosage(med.getDosage() != null ? med.getDosage() : "")
                        .beforeFood(Boolean.TRUE.equals(med.getBeforeFood()))
                        .reminderTime(formatTime(s.getReminderTime()))
                        .status(status)
                        .takenTime(takenTime)
                        .build());
            }
        }

        todayTimeline.sort(Comparator.comparing(DoseTimelineItem::getReminderTime, Comparator.nullsLast(String::compareTo)));

        int todayTaken = (int) todayTimeline.stream()
                .filter(item -> "TAKEN".equals(item.getStatus()))
                .count();

        int upcomingDoses = (int) todayTimeline.stream()
                .filter(item -> "UPCOMING".equals(item.getStatus()))
                .count();

        double todayExpected = todayTimeline.size();
        double adherence = todayExpected == 0 ? 100.0 : ((double) todayTaken / todayExpected) * 100.0;

        List<Long> medicineIds = rawMedicines.stream().map(Medicine::getId).collect(Collectors.toList());
        List<DoseLog> allLogs = Collections.emptyList();
        if (!medicineIds.isEmpty()) {
            LocalDate startDate = today.minusDays(6);
            allLogs = doseLogRepository.findByMedicineIdsAndDateBetween(medicineIds, startDate, today);
        }

        java.util.Map<String, Long> takenCountMap = allLogs.stream()
                .filter(log -> log.getStatus() == DoseStatus.TAKEN)
                .collect(Collectors.groupingBy(
                        log -> log.getMedicine().getId() + "-" + log.getDate(),
                        Collectors.counting()
                ));

        List<AdherenceMetric> weeklyAdherence = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            int expectedCount = 0;
            int takenCount = 0;

            for (Medicine med : rawMedicines) {
                if (!isMedicineActiveOnDate(med, day)) {
                    continue;
                }
                expectedCount += safeSchedules(med).size();

                String key = med.getId() + "-" + day;
                takenCount += takenCountMap.getOrDefault(key, 0L).intValue();
            }

            double dayAdherence = expectedCount == 0 ? 100.0 : ((double) takenCount / expectedCount) * 100.0;
            weeklyAdherence.add(AdherenceMetric.builder()
                    .date(day)
                    .expectedDoses(expectedCount)
                    .takenDoses(takenCount)
                    .adherencePercentage(Math.round(dayAdherence * 10.0) / 10.0)
                    .build());
        }

        List<DoseLogResponse> recentActivity = doseLogRepository.findByUserIdWithMedicine(user.getId())
                .stream()
                .limit(10)
                .map(log -> DoseLogResponse.builder()
                        .id(log.getId())
                        .medicineId(log.getMedicine().getId())
                        .medicineName(log.getMedicine().getMedicineName())
                        .date(log.getDate())
                        .reminderTime(log.getReminderTime())
                        .status(log.getStatus())
                        .takenTime(log.getTakenTime())
                        .build())
                .collect(Collectors.toList());

        return DashboardSummary.builder()
                .todayMedicinesTaken(todayTaken)
                .upcomingDoses(upcomingDoses)
                .adherencePercentage(Math.round(adherence * 10.0) / 10.0)
                .activeMedicines(activeMedicines != null ? activeMedicines : Collections.emptyList())
                .todayTimeline(todayTimeline)
                .weeklyAdherence(weeklyAdherence)
                .recentActivity(recentActivity != null ? recentActivity : Collections.emptyList())
                .build();
    }

    private boolean isMedicineActiveOnDate(Medicine med, LocalDate day) {
        return Boolean.TRUE.equals(med.getIsActive())
                && (med.getStartDate() == null || !med.getStartDate().isAfter(day))
                && (med.getEndDate() == null || !med.getEndDate().isBefore(day));
    }

    private List<Schedule> safeSchedules(Medicine med) {
        if (med.getSchedules() == null) {
            return Collections.emptyList();
        }
        return med.getSchedules();
    }

    private String formatTime(LocalTime time) {
        if (time == null) {
            return null;
        }
        return time.format(TIME_FMT);
    }
}
