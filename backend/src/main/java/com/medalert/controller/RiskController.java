package com.medalert.controller;

import com.medalert.model.RiskAlert;
import com.medalert.service.RiskMonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {

    private final RiskMonitoringService riskMonitoringService;

    @GetMapping("/alerts")
    public ResponseEntity<List<RiskAlertResponse>> getAlerts(Authentication authentication) {
        List<RiskAlert> alerts = riskMonitoringService.getPatientAlerts(authentication.getName());
        return ResponseEntity.ok(alerts.stream().map(this::toResponse).toList());
    }

    @PostMapping("/alerts/{alertId}/acknowledge")
    public ResponseEntity<RiskAlertResponse> acknowledgeAlert(
            Authentication authentication,
            @PathVariable Long alertId) {
        RiskAlert alert = riskMonitoringService.acknowledgeAlert(alertId, authentication.getName());
        return ResponseEntity.ok(toResponse(alert));
    }

    private RiskAlertResponse toResponse(RiskAlert a) {
        return new RiskAlertResponse(
                a.getId(),
                a.getAlertType(),
                a.getSeverity(),
                a.getMessage(),
                a.getMedicineName(),
                a.getMetricValue(),
                a.getThresholdValue(),
                a.getCreatedAt() != null ? a.getCreatedAt().toString() : null,
                a.getAcknowledged()
        );
    }

    public record RiskAlertResponse(
            Long id,
            String alertType,
            String severity,
            String message,
            String medicineName,
            Double metricValue,
            Double thresholdValue,
            String createdAt,
            Boolean acknowledged
    ) {}
}
