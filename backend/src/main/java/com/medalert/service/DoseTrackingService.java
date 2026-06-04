package com.medalert.service;

import com.medalert.dto.DoseLogRequest;
import com.medalert.dto.DoseLogResponse;
import com.medalert.dto.NotificationAcknowledgeRequest;
import com.medalert.model.DoseLog;
import com.medalert.model.DoseStatus;
import com.medalert.model.Medicine;
import com.medalert.model.Role;
import com.medalert.model.User;
import com.medalert.repository.CaretakerLinkRepository;
import com.medalert.repository.DoseLogRepository;
import com.medalert.repository.MedicineRepository;
import com.medalert.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoseTrackingService {

    private final DoseLogRepository doseLogRepository;
    private final MedicineRepository medicineRepository;
    private final UserRepository userRepository;
    private final CaretakerLinkRepository caretakerLinkRepository;
    private final NotificationEscalationService notificationEscalationService;

    @Transactional
    public DoseLogResponse logDose(String userEmail, DoseLogRequest request) {
        // 1. Role validation - strict write block for caretakers
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (currentUser.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers are strictly read-only and cannot log doses.");
        }

        // 2. Fetch medicine and authorize ownership
        Medicine medicine = medicineRepository.findById(request.getMedicineId())
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        if (!medicine.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this medicine");
        }

        if (request.getReminderTime() == null) {
            throw new RuntimeException("Reminder time is required to log a dose");
        }

        // 3. Safe log lookup to prevent duplicate records
        Optional<DoseLog> existingLogOpt = doseLogRepository.findByMedicineIdAndDateAndReminderTime(
                medicine.getId(), request.getDate(), request.getReminderTime()
        );

        DoseLog log;
        if (existingLogOpt.isPresent()) {
            log = existingLogOpt.get();
            DoseStatus oldStatus = log.getStatus();
            DoseStatus newStatus = request.getStatus();

            // Stock adjustment logic on status transition
            if (oldStatus != DoseStatus.TAKEN && newStatus == DoseStatus.TAKEN) {
                // Decrement stock if changed to TAKEN
                if (medicine.getStockCount() != null && medicine.getStockCount() > 0) {
                    medicine.setStockCount(medicine.getStockCount() - 1);
                    medicineRepository.save(medicine);
                }
            } else if (oldStatus == DoseStatus.TAKEN && newStatus != DoseStatus.TAKEN) {
                // Restore/increment stock if changed away from TAKEN
                if (medicine.getStockCount() != null) {
                    medicine.setStockCount(medicine.getStockCount() + 1);
                    medicineRepository.save(medicine);
                }
            }
            
            // Update existing log fields
            log.setStatus(newStatus);
            log.setTakenTime(request.getTakenTime());
        } else {
            // Create a brand new log record
            log = DoseLog.builder()
                    .medicine(medicine)
                    .date(request.getDate())
                    .reminderTime(request.getReminderTime())
                    .status(request.getStatus())
                    .takenTime(request.getTakenTime())
                    .build();

            // Decrement stock only if logging as TAKEN
            if (request.getStatus() == DoseStatus.TAKEN) {
                if (medicine.getStockCount() != null && medicine.getStockCount() > 0) {
                    medicine.setStockCount(medicine.getStockCount() - 1);
                    medicineRepository.save(medicine);
                }
            }
        }

        DoseLog savedLog = doseLogRepository.save(log);

        try {
            NotificationAcknowledgeRequest ack = new NotificationAcknowledgeRequest();
            ack.setMedicineId(request.getMedicineId());
            ack.setReminderDate(request.getDate().toString());
            ack.setReminderTime(request.getReminderTime().format(
                    java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
            notificationEscalationService.acknowledge(userEmail, ack);
        } catch (Exception ignored) {
            // Non-blocking: dose log succeeds even if notification ack fails
        }

        return mapToResponse(savedLog);
    }

    @Transactional(readOnly = true)
    public List<DoseLogResponse> getLogsForMedicine(Long medicineId, String userEmail, int page, int size) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Medicine medicine = medicineRepository.findById(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
        
        if (!medicine.getUser().getId().equals(currentUser.getId())) {
            if (currentUser.getRole() == Role.CARETAKER) {
                caretakerLinkRepository.findByPatientIdAndCaretakerId(medicine.getUser().getId(), currentUser.getId())
                        .orElseThrow(() -> new RuntimeException("Access Denied: You are not linked to this patient."));
            } else {
                throw new RuntimeException("Unauthorized");
            }
        }

        org.springframework.data.domain.PageRequest pr = org.springframework.data.domain.PageRequest.of(page, size);
        return doseLogRepository.findByMedicineIdWithMedicinePageable(medicineId, pr).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoseLogResponse> getUserDoseHistory(String userEmail, int page, int size) {
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // If caretaker, they shouldn't fetch their own empty history this way; they should fetch via patient endpoints
        if (currentUser.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers must specify a patient to view history");
        }

        org.springframework.data.domain.PageRequest pr = org.springframework.data.domain.PageRequest.of(page, size);
        return doseLogRepository.findByUserIdWithMedicinePageable(currentUser.getId(), pr).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DoseLogResponse mapToResponse(DoseLog log) {
        var medicine = log.getMedicine();
        return DoseLogResponse.builder()
                .id(log.getId())
                .medicineId(medicine != null ? medicine.getId() : null)
                .medicineName(medicine != null ? medicine.getMedicineName() : null)
                .date(log.getDate())
                .reminderTime(log.getReminderTime())
                .status(log.getStatus())
                .takenTime(log.getTakenTime())
                .build();
    }
}

