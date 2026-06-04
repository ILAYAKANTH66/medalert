package com.medalert.controller;

import com.medalert.model.EmergencyEvent;
import com.medalert.service.EmergencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergency")
@RequiredArgsConstructor
public class EmergencyController {

    private final EmergencyService emergencyService;

    @PostMapping("/trigger")
    public ResponseEntity<EmergencyEventResponse> triggerEmergency(
            Authentication authentication,
            @RequestBody(required = false) EmergencyRequest body) {

        Double lat = body != null ? body.lat() : null;
        Double lng = body != null ? body.lng() : null;
        String address = body != null ? body.address() : null;

        EmergencyEvent event = emergencyService.triggerEmergency(
                authentication.getName(), lat, lng, address);

        return ResponseEntity.ok(toResponse(event));
    }

    @PostMapping("/{eventId}/resolve")
    public ResponseEntity<EmergencyEventResponse> resolveEmergency(
            Authentication authentication,
            @PathVariable Long eventId) {
        EmergencyEvent event = emergencyService.resolveEmergency(eventId, authentication.getName());
        return ResponseEntity.ok(toResponse(event));
    }

    @GetMapping
    public ResponseEntity<List<EmergencyEventResponse>> getRecentEmergencies(Authentication authentication) {
        List<EmergencyEvent> events = emergencyService.getRecentEmergencies(authentication.getName());
        return ResponseEntity.ok(events.stream().map(this::toResponse).toList());
    }

    private EmergencyEventResponse toResponse(EmergencyEvent e) {
        return new EmergencyEventResponse(
                e.getId(),
                e.getPatient().getId(),
                e.getPatient().getName(),
                e.getTriggeredAt() != null ? e.getTriggeredAt().toString() : null,
                e.getLocationLat(),
                e.getLocationLng(),
                e.getLocationAddress(),
                e.getAlertSentToCaretaker(),
                e.getVoiceCallTriggered(),
                e.getResolved(),
                e.getResolvedAt() != null ? e.getResolvedAt().toString() : null
        );
    }

    public record EmergencyRequest(Double lat, Double lng, String address) {}

    public record EmergencyEventResponse(
            Long id,
            Long patientId,
            String patientName,
            String triggeredAt,
            Double locationLat,
            Double locationLng,
            String locationAddress,
            Boolean alertSentToCaretaker,
            Boolean voiceCallTriggered,
            Boolean resolved,
            String resolvedAt
    ) {}
}
