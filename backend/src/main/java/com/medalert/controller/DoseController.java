package com.medalert.controller;

import com.medalert.dto.DoseLogRequest;
import com.medalert.dto.DoseLogResponse;
import com.medalert.service.DoseTrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doses")
@RequiredArgsConstructor
public class DoseController {

    private final DoseTrackingService doseTrackingService;

    @PostMapping
    public ResponseEntity<DoseLogResponse> logDose(
            @RequestBody DoseLogRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(doseTrackingService.logDose(authentication.getName(), request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<DoseLogResponse>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(doseTrackingService.getUserDoseHistory(authentication.getName(), page, size));
    }

    @GetMapping("/{medicineId}")
    public ResponseEntity<List<DoseLogResponse>> getLogs(
            @PathVariable Long medicineId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(doseTrackingService.getLogsForMedicine(medicineId, authentication.getName(), page, size));
    }
}
