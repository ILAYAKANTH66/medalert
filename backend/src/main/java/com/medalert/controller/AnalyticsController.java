package com.medalert.controller;

import com.medalert.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAnalytics(
            Authentication authentication,
            @RequestParam(defaultValue = "weekly") String period) {
        return ResponseEntity.ok(analyticsService.getAnalytics(authentication.getName(), period));
    }
}
