package com.medalert.service;

import com.medalert.dto.UserPreferencesDto;
import com.medalert.dto.UserPreferencesRequest;
import com.medalert.model.Role;
import com.medalert.model.User;
import com.medalert.model.UserPreferences;
import com.medalert.repository.UserPreferencesRepository;
import com.medalert.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserPreferencesService {

    private final UserPreferencesRepository preferencesRepository;
    private final UserRepository userRepository;
    private final VoiceCallService voiceCallService;

    @Transactional
    public UserPreferencesDto getPreferences(String userEmail) {
        User user = requireAnyUser(userEmail);
        UserPreferences prefs = getOrCreatePreferences(user);
        return mapToDto(prefs);
    }

    @Transactional
    public UserPreferencesDto updatePreferences(String userEmail, UserPreferencesRequest request) {
        User user = requireAnyUser(userEmail);
        UserPreferences prefs = getOrCreatePreferences(user);

        // Caretakers can only update phone number and voice provider
        boolean isCaretaker = user.getRole() == Role.CARETAKER;

        if (!isCaretaker && request.getBrowserNotificationsEnabled() != null) {
            prefs.setBrowserNotificationsEnabled(request.getBrowserNotificationsEnabled());
        }
        if (!isCaretaker && request.getVoiceEscalationEnabled() != null) {
            prefs.setVoiceEscalationEnabled(request.getVoiceEscalationEnabled());
        }
        if (!isCaretaker && request.getSilentMode() != null) {
            prefs.setSilentMode(request.getSilentMode());
        }
        if (!isCaretaker && request.getEscalationDelayMinutes() != null) {
            prefs.setEscalationDelayMinutes(clamp(request.getEscalationDelayMinutes(), 1, 60));
        }
        if (!isCaretaker && request.getVoiceEscalationDelayMinutes() != null) {
            prefs.setVoiceEscalationDelayMinutes(clamp(request.getVoiceEscalationDelayMinutes(), 1, 60));
        }
        if (!isCaretaker && request.getReminderFrequencyMinutes() != null) {
            prefs.setReminderFrequencyMinutes(clamp(request.getReminderFrequencyMinutes(), 1, 30));
        }
        // Both patients and caretakers can set their phone number and voice provider
        if (request.getPhoneNumber() != null) {
            prefs.setPhoneNumber(request.getPhoneNumber().trim().isEmpty() ? null : request.getPhoneNumber().trim());
        }
        if (request.getVoiceProvider() != null) {
            prefs.setVoiceProvider(request.getVoiceProvider());
        }
        if (!isCaretaker && request.getMaxVoiceCallAttempts() != null) {
            prefs.setMaxVoiceCallAttempts(clamp(request.getMaxVoiceCallAttempts(), 1, 3));
        }

        return mapToDto(preferencesRepository.save(prefs));
    }

    @Transactional
    public UserPreferences getOrCreatePreferencesEntity(Long userId) {
        return preferencesRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    return ensureDefaultPreferences(user);
                });
    }

    @Transactional
    public UserPreferences ensureDefaultPreferences(User user) {
        return preferencesRepository.findByUserId(user.getId())
                .orElseGet(() -> preferencesRepository.save(UserPreferences.defaultsFor(user)));
    }

    @Transactional
    public UserPreferences getPreferencesEntity(Long userId) {
        return getOrCreatePreferencesEntity(userId);
    }

    public String testVoiceCall(String userEmail) {
        User user = requireAnyUser(userEmail);
        UserPreferences prefs = getOrCreatePreferences(user);
        if (prefs.getPhoneNumber() == null || prefs.getPhoneNumber().isBlank()) {
            throw new RuntimeException("Add a mobile number in settings before testing voice calls.");
        }
        try {
            return voiceCallService.initiateMedicineReminderCall(
                    prefs.getPhoneNumber(),
                    user.getName(),
                    "Medicine Reminder Test",
                    prefs.getVoiceProvider() != null ? prefs.getVoiceProvider() : "TWILIO"
            ).join();
        } catch (Exception ex) {
            throw new RuntimeException("Voice test failed: " + ex.getMessage(), ex);
        }
    }

    private User requirePatient(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() == Role.CARETAKER) {
            throw new RuntimeException("Unauthorized: Caretakers cannot modify notification settings.");
        }
        return user;
    }

    private User requireAnyUser(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private UserPreferences getOrCreatePreferences(User user) {
        return ensureDefaultPreferences(user);
    }

    private UserPreferencesDto mapToDto(UserPreferences prefs) {
        return UserPreferencesDto.builder()
                .browserNotificationsEnabled(prefs.getBrowserNotificationsEnabled())
                .voiceEscalationEnabled(prefs.getVoiceEscalationEnabled())
                .silentMode(prefs.getSilentMode())
                .escalationDelayMinutes(prefs.getEscalationDelayMinutes())
                .voiceEscalationDelayMinutes(prefs.getVoiceEscalationDelayMinutes())
                .reminderFrequencyMinutes(prefs.getReminderFrequencyMinutes())
                .phoneNumber(prefs.getPhoneNumber())
                .voiceProvider(prefs.getVoiceProvider())
                .maxVoiceCallAttempts(prefs.getMaxVoiceCallAttempts())
                .build();
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
