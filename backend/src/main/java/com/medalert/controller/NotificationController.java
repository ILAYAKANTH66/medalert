package com.medalert.controller;

import com.medalert.dto.*;
import com.medalert.service.NotificationEscalationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationEscalationService notificationEscalationService;

    @PostMapping("/level1")
    public ResponseEntity<NotificationLogDto> registerLevel1(
            @RequestBody NotificationEventRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(notificationEscalationService.registerLevel1(authentication.getName(), request));
    }

    @PostMapping("/level2")
    public ResponseEntity<NotificationLogDto> markLevel2Sent(
            @RequestBody NotificationEventRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(notificationEscalationService.markLevel2Sent(authentication.getName(), request));
    }

    @PostMapping("/acknowledge")
    public ResponseEntity<NotificationLogDto> acknowledge(
            @RequestBody NotificationAcknowledgeRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(notificationEscalationService.acknowledge(authentication.getName(), request));
    }

    @GetMapping("/pending-actions")
    public ResponseEntity<List<PendingNotificationActionDto>> getPendingActions(Authentication authentication) {
        return ResponseEntity.ok(notificationEscalationService.getPendingClientActions(authentication.getName()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<NotificationLogDto>> getHistory(Authentication authentication) {
        return ResponseEntity.ok(notificationEscalationService.getRecentLogs(authentication.getName()));
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> testNotification(Authentication authentication) {
        return ResponseEntity.ok(Map.of(
                "message", "Test notification registered. Enable browser notifications to see alerts."
        ));
    }
}
