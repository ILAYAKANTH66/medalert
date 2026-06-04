package com.medalert.service;

import com.medalert.service.voice.VoiceCallProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class VoiceCallService {

    private final Map<String, VoiceCallProvider> providersById;

    public VoiceCallService(List<VoiceCallProvider> providers) {
        this.providersById = providers.stream()
                .collect(Collectors.toMap(VoiceCallProvider::getProviderId, Function.identity()));
    }

    @Async("voiceCallExecutor")
    public java.util.concurrent.CompletableFuture<String> initiateMedicineReminderCall(
            String toPhoneE164, String patientName, String medicineName, String provider) {
        if (toPhoneE164 == null || toPhoneE164.isBlank()) {
            return java.util.concurrent.CompletableFuture.completedFuture(null);
        }
        String normalized = normalizePhone(toPhoneE164);
        String providerId = provider != null ? provider.toUpperCase() : "TWILIO";
        VoiceCallProvider voiceProvider = providersById.getOrDefault(providerId,
                providersById.getOrDefault("TWILIO",
                        providersById.values().stream().findFirst().orElse(null)));
        if (voiceProvider == null) {
            log.warn("[VoiceCall] No voice provider available — returning demo SID");
            return java.util.concurrent.CompletableFuture.completedFuture("DEMO_NO_PROVIDER_" + System.currentTimeMillis());
        }
        try {
            String callSid = voiceProvider.placeMedicineReminderCall(normalized, patientName, medicineName);
            return java.util.concurrent.CompletableFuture.completedFuture(callSid);
        } catch (Exception e) {
            return java.util.concurrent.CompletableFuture.failedFuture(e);
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String trimmed = phone.trim().replaceAll("\\s+", "");
        if (trimmed.startsWith("+")) return trimmed;
        if (trimmed.length() == 10) return "+91" + trimmed;
        return "+" + trimmed;
    }
}
