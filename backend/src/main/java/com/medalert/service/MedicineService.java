package com.medalert.service;

import com.medalert.dto.MedicineRequest;
import com.medalert.dto.MedicineResponse;
import com.medalert.dto.ScheduleDto;
import com.medalert.model.Medicine;
import com.medalert.model.Role;
import com.medalert.model.Schedule;
import com.medalert.model.User;
import com.medalert.repository.CaretakerLinkRepository;
import com.medalert.repository.MedicineRepository;
import com.medalert.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final UserRepository userRepository;
    private final CaretakerLinkRepository caretakerLinkRepository;

    @Transactional
    public MedicineResponse createMedicine(String userEmail, MedicineRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers cannot edit or add medicines.");
        }

        Medicine medicine = Medicine.builder()
                .user(user)
                .medicineName(request.getMedicineName())
                .dosage(request.getDosage())
                .stockCount(request.getStockCount())
                .beforeFood(request.getBeforeFood())
                .dailyFrequency(request.getDailyFrequency())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();

        List<Schedule> schedules = request.getReminderTimes().stream().map(timeStr -> {
            return Schedule.builder()
                    .medicine(medicine)
                    .reminderTime(LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm")))
                    .status("active")
                    .build();
        }).collect(Collectors.toList());

        medicine.setSchedules(schedules);
        Medicine savedMedicine = medicineRepository.save(medicine);

        return mapToResponse(savedMedicine);
    }

    @Transactional(readOnly = true)
    public List<MedicineResponse> getMyMedicines(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // If user is a caretaker, they don't have their own medicines; they read patient medicines via patient-specific routes.
        if (user.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers must view patient-specific medicines.");
        }

        return medicineRepository.findActiveByUserIdWithSchedules(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MedicineResponse getMedicineById(Long id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Medicine medicine = medicineRepository.findByIdWithSchedules(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        if (!medicine.getUser().getId().equals(user.getId())) {
            if (user.getRole() == Role.CARETAKER) {
                caretakerLinkRepository.findByPatientIdAndCaretakerId(medicine.getUser().getId(), user.getId())
                        .orElseThrow(() -> new RuntimeException("Access Denied: You are not linked to this patient."));
            } else {
                throw new RuntimeException("Unauthorized");
            }
        }
        return mapToResponse(medicine);
    }

    @Transactional
    public MedicineResponse updateMedicine(Long id, String userEmail, MedicineRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers cannot edit or add medicines.");
        }

        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
        
        if (!medicine.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        medicine.setMedicineName(request.getMedicineName());
        medicine.setDosage(request.getDosage());
        medicine.setStockCount(request.getStockCount());
        medicine.setBeforeFood(request.getBeforeFood());
        medicine.setDailyFrequency(request.getDailyFrequency());
        medicine.setStartDate(request.getStartDate());
        medicine.setEndDate(request.getEndDate());

        medicine.getSchedules().clear();
        
        if (request.getReminderTimes() != null) {
            List<Schedule> newSchedules = request.getReminderTimes().stream().map(timeStr -> {
                return Schedule.builder()
                        .medicine(medicine)
                        .reminderTime(LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm")))
                        .status("active")
                        .build();
                    }).collect(Collectors.toList());
            medicine.getSchedules().addAll(newSchedules);
        }

        Medicine updatedMedicine = medicineRepository.save(medicine);
        return mapToResponse(updatedMedicine);
    }

    @Transactional
    public void softDeleteMedicine(Long id, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers cannot delete medicines.");
        }

        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
        
        if (!medicine.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        medicine.setIsActive(false);
        medicineRepository.save(medicine);
    }

    public MedicineResponse mapToResponse(Medicine medicine) {
        var schedules = medicine.getSchedules() != null ? medicine.getSchedules() : Collections.<Schedule>emptyList();

        List<ScheduleDto> scheduleDtos = schedules.stream()
                .filter(s -> s.getReminderTime() != null)
                .map(s -> ScheduleDto.builder()
                        .id(s.getId())
                        .reminderTime(s.getReminderTime().toString())
                        .status(s.getStatus() != null ? s.getStatus() : "active")
                        .build())
                .collect(Collectors.toList());

        int freq = schedules.size();
        Integer daysRemaining = null;
        LocalDate refillDate = null;
        Boolean refillWarning = false;

        if (medicine.getStockCount() != null && freq > 0) {
            daysRemaining = medicine.getStockCount() / freq;
            refillDate = LocalDate.now().plusDays(daysRemaining);
            refillWarning = daysRemaining <= 3; // Warning if 3 or fewer days of supply remain
        } else if (medicine.getStockCount() != null) {
            refillWarning = medicine.getStockCount() <= 5;
        }

        return MedicineResponse.builder()
                .id(medicine.getId())
                .medicineName(medicine.getMedicineName())
                .dosage(medicine.getDosage())
                .stockCount(medicine.getStockCount())
                .beforeFood(medicine.getBeforeFood())
                .dailyFrequency(medicine.getDailyFrequency())
                .startDate(medicine.getStartDate())
                .endDate(medicine.getEndDate())
                .isActive(medicine.getIsActive())
                .schedules(scheduleDtos.isEmpty() ? Collections.emptyList() : scheduleDtos)
                .daysRemaining(daysRemaining)
                .refillPredictionDate(refillDate)
                .refillWarning(refillWarning)
                .build();
    }
}

