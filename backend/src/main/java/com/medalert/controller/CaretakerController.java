package com.medalert.controller;

import com.medalert.dto.CaretakerLinkRequest;
import com.medalert.dto.DashboardSummary;
import com.medalert.dto.DoseLogResponse;
import com.medalert.dto.MedicineResponse;
import com.medalert.dto.UserProfileResponse;
import com.medalert.service.CaretakerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/caretaker")
@RequiredArgsConstructor
public class CaretakerController {

    private final CaretakerService caretakerService;

    @PostMapping("/link")
    public ResponseEntity<UserProfileResponse> linkPatient(
            @RequestBody CaretakerLinkRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(caretakerService.linkPatient(authentication.getName(), request));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<UserProfileResponse>> getLinkedPatients(Authentication authentication) {
        return ResponseEntity.ok(caretakerService.getLinkedPatients(authentication.getName()));
    }

    @GetMapping("/patients/{patientId}/dashboard")
    public ResponseEntity<DashboardSummary> getPatientDashboard(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(caretakerService.getPatientDashboardSummary(authentication.getName(), patientId));
    }

    @GetMapping("/patients/{patientId}/medicines")
    public ResponseEntity<List<MedicineResponse>> getPatientMedicines(
            @PathVariable Long patientId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(caretakerService.getPatientMedicines(authentication.getName(), patientId));
    }

    @GetMapping("/patients/{patientId}/medicines/{medicineId}/logs")
    public ResponseEntity<List<DoseLogResponse>> getPatientMedicineLogs(
            @PathVariable Long patientId,
            @PathVariable Long medicineId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(caretakerService.getPatientMedicineLogs(authentication.getName(), patientId, medicineId, page, size));
    }
}
