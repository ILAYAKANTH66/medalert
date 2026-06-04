package com.medalert.service;

import com.medalert.dto.CaretakerLinkRequest;
import com.medalert.dto.DashboardSummary;
import com.medalert.dto.DoseLogResponse;
import com.medalert.dto.MedicineResponse;
import com.medalert.dto.UserProfileResponse;
import com.medalert.model.CaretakerLink;
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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CaretakerService {

    private final UserRepository userRepository;
    private final CaretakerLinkRepository caretakerLinkRepository;
    private final MedicineRepository medicineRepository;
    private final DoseLogRepository doseLogRepository;
    private final DashboardService dashboardService;
    private final MedicineService medicineService;
    private final DoseTrackingService doseTrackingService;

    @Transactional
    public UserProfileResponse linkPatient(String caretakerEmail, CaretakerLinkRequest request) {
        User caretaker = userRepository.findByEmail(caretakerEmail)
                .orElseThrow(() -> new RuntimeException("Caretaker not found"));

        if (caretaker.getRole() != Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Only caretakers can link patients.");
        }

        String patientToken = request.getPatientToken();
        if (patientToken == null || patientToken.trim().isEmpty()) {
            throw new RuntimeException("Patient token is required");
        }

        User patient = userRepository.findByCaretakerToken(patientToken.trim())
                .orElseThrow(() -> new RuntimeException("Patient with given token not found"));

        if (patient.getRole() != Role.PATIENT) {
            throw new RuntimeException("Invalid token: Targeted account is not a patient.");
        }

        // Check if link already exists
        if (caretakerLinkRepository.findByPatientIdAndCaretakerId(patient.getId(), caretaker.getId()).isPresent()) {
            throw new RuntimeException("You are already linked to this patient.");
        }

        CaretakerLink link = CaretakerLink.builder()
                .caretaker(caretaker)
                .patient(patient)
                .build();
        caretakerLinkRepository.save(link);

        return mapToUserProfile(patient);
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getLinkedPatients(String caretakerEmail) {
        User caretaker = userRepository.findByEmail(caretakerEmail)
                .orElseThrow(() -> new RuntimeException("Caretaker not found"));

        return caretakerLinkRepository.findByCaretakerIdWithPatient(caretaker.getId()).stream()
                .map(link -> mapToUserProfile(link.getPatient()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DashboardSummary getPatientDashboardSummary(String caretakerEmail, Long patientId) {
        User patient = validateAndGetPatient(caretakerEmail, patientId);
        return dashboardService.getPatientDashboard(patient.getEmail());
    }

    @Transactional(readOnly = true)
    public List<MedicineResponse> getPatientMedicines(String caretakerEmail, Long patientId) {
        User patient = validateAndGetPatient(caretakerEmail, patientId);
        return medicineRepository.findActiveByUserIdWithSchedules(patient.getId()).stream()
                .map(medicineService::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoseLogResponse> getPatientMedicineLogs(String caretakerEmail, Long patientId, Long medicineId, int page, int size) {
        validateAndGetPatient(caretakerEmail, patientId);

        Medicine medicine = medicineRepository.findByIdWithSchedules(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        if (medicine.getUser() == null || !medicine.getUser().getId().equals(patientId)) {
            throw new RuntimeException("Unauthorized: Medicine does not belong to the linked patient.");
        }

        org.springframework.data.domain.PageRequest pr = org.springframework.data.domain.PageRequest.of(page, size);
        return doseLogRepository.findByMedicineIdWithMedicinePageable(medicineId, pr).stream()
                .map(doseTrackingService::mapToResponse)
                .collect(Collectors.toList());
    }

    private User validateAndGetPatient(String caretakerEmail, Long patientId) {
        User caretaker = userRepository.findByEmail(caretakerEmail)
                .orElseThrow(() -> new RuntimeException("Caretaker not found"));

        if (caretaker.getRole() != Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Only caretakers can access this endpoint.");
        }

        caretakerLinkRepository.findByPatientIdAndCaretakerIdWithUsers(patientId, caretaker.getId())
                .orElseThrow(() -> new RuntimeException("Access Denied: You are not linked to this patient."));

        return userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
    }

    private UserProfileResponse mapToUserProfile(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .caretakerToken(user.getCaretakerToken())
                .build();
    }
}
