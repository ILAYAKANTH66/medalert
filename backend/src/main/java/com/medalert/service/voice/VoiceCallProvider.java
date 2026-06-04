package com.medalert.service.voice;

/**
 * Abstraction for voice escalation providers (Twilio, Exotel, etc.).
 */
public interface VoiceCallProvider {

    String getProviderId();

    String placeMedicineReminderCall(String phoneE164, String patientName, String medicineName);
}
