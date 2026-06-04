package com.medalert.service;

import com.medalert.model.EmergencyEvent;
import com.medalert.model.User;
import com.medalert.repository.CaretakerLinkRepository;
import com.medalert.repository.EmergencyEventRepository;
import com.medalert.repository.UserRepository;
import com.medalert.repository.UserPreferencesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmergencyService {

    private final EmergencyEventRepository emergencyEventRepository;
    private final UserRepository userRepository;
    private final CaretakerLinkRepository caretakerLinkRepository;
    private final UserPreferencesRepository userPreferencesRepository;
    private final VoiceCallService voiceCallService;

    @Transactional
    public EmergencyEvent triggerEmergency(String patientEmail, Double lat, Double lng, String address) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        EmergencyEvent event = EmergencyEvent.builder()
                .patient(patient)
                .triggeredAt(LocalDateTime.now())
                .locationLat(lat)
                .locationLng(lng)
                .locationAddress(address)
                .alertSentToCaretaker(false)
                .voiceCallTriggered(false)
                .resolved(false)
                .build();

        EmergencyEvent saved = emergencyEventRepository.save(event);

        // Async: notify caretakers via voice call
        notifyCaretakersAsync(saved.getId(), patient);

        return saved;
    }

    @Async("voiceCallExecutor")
    public void notifyCaretakersAsync(Long eventId, User patient) {
        try {
            List<?> caretakerLinks = caretakerLinkRepository.findByPatientIdWithCaretaker(patient.getId());

            boolean anyCallMade = false;
            for (Object linkObj : caretakerLinks) {
                try {
                    com.medalert.model.CaretakerLink link = (com.medalert.model.CaretakerLink) linkObj;
                    User caretaker = link.getCaretaker();
                    var prefOpt = userPreferencesRepository.findByUserId(caretaker.getId());
                    String phone = prefOpt.map(p -> p.getPhoneNumber()).orElse(null);
                    if (phone != null && !phone.isBlank()) {
                        voiceCallService.initiateMedicineReminderCall(
                                phone,
                                caretaker.getName(),
                                "EMERGENCY: " + patient.getName() + " has triggered an emergency SOS!",
                                "TWILIO"
                        );
                        anyCallMade = true;
                        log.info("[Emergency] Voice call initiated to caretaker {} for patient {}", caretaker.getEmail(), patient.getEmail());
                    } else {
                        log.warn("[Emergency] Caretaker {} has no phone configured", caretaker.getEmail());
                    }
                } catch (Exception ex) {
                    log.error("[Emergency] Failed to notify caretaker", ex);
                }
            }

            final boolean voiceCallWasTriggered = anyCallMade;
            emergencyEventRepository.findById(eventId).ifPresent(e -> {
                e.setAlertSentToCaretaker(true);
                e.setVoiceCallTriggered(voiceCallWasTriggered);
                emergencyEventRepository.save(e);
            });
        } catch (Exception e) {
            log.error("[Emergency] Failed to notify caretakers for event {}", eventId, e);
        }
    }

    @Transactional
    public EmergencyEvent resolveEmergency(Long eventId, String patientEmail) {
        EmergencyEvent event = emergencyEventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Emergency event not found"));

        if (!event.getPatient().getEmail().equals(patientEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        event.setResolved(true);
        event.setResolvedAt(LocalDateTime.now());
        return emergencyEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<EmergencyEvent> getRecentEmergencies(String patientEmail) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        return emergencyEventRepository.findByPatientIdOrderByTriggeredAtDesc(patient.getId());
    }
}
