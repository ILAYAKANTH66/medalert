package com.medalert.service.voice;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ExotelVoiceCallProvider implements VoiceCallProvider {

    @Override
    public String getProviderId() {
        return "EXOTEL";
    }

    @Override
    public String placeMedicineReminderCall(String phoneE164, String patientName, String medicineName) {
        log.info("[Voice/Exotel] Demo mode — simulated call to {} for patient {}, medicine {}", phoneE164, patientName, medicineName);
        return "EXOTEL_DEMO_" + System.currentTimeMillis();
    }
}
