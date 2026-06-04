package com.medalert.controller;

import com.medalert.dto.UserPreferencesDto;
import com.medalert.dto.UserPreferencesRequest;
import com.medalert.service.UserPreferencesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/preferences")
@RequiredArgsConstructor
public class PreferencesController {

    private final UserPreferencesService userPreferencesService;

    @GetMapping
    public ResponseEntity<UserPreferencesDto> getPreferences(Authentication authentication) {
        return ResponseEntity.ok(userPreferencesService.getPreferences(authentication.getName()));
    }

    @PutMapping
    public ResponseEntity<UserPreferencesDto> updatePreferences(
            @RequestBody UserPreferencesRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(userPreferencesService.updatePreferences(authentication.getName(), request));
    }

    @PostMapping("/test-voice-call")
    public ResponseEntity<Map<String, String>> testVoiceCall(Authentication authentication) {
        String callSid = userPreferencesService.testVoiceCall(authentication.getName());
        return ResponseEntity.ok(Map.of(
                "message", "Voice call initiated successfully",
                "callSid", callSid != null ? callSid : "demo"
        ));
    }
}
