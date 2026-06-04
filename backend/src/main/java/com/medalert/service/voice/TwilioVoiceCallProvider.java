package com.medalert.service.voice;

import com.medalert.config.TwilioProperties;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Call;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TwilioVoiceCallProvider implements VoiceCallProvider {

    private static final String MEDALERT_TWIML =
            "<Response><Say voice=\"alice\">Hello. This is MedAlert. It is time to take your medicine.</Say></Response>";

    private final TwilioProperties twilioProperties;

    @Override
    public String getProviderId() {
        return "TWILIO";
    }

    @Override
    public String placeMedicineReminderCall(String phoneE164, String patientName, String medicineName) {
        String twimlText = String.format(
                "<Response><Say voice=\"alice\">Hello %s. This is your MedAlert reminder. It is time to take your %s medicine.</Say></Response>",
                patientName != null ? patientName : "Patient",
                medicineName != null ? medicineName : "scheduled"
        );

        log.info("[Voice/Twilio] Checking configuration state for Twilio call placement.");
        if (!twilioProperties.isEnabled()) {
            log.error("[Voice/Twilio] Call aborted: Twilio provider is disabled in configuration.");
            throw new RuntimeException("Twilio voice escalation is disabled in the system configuration.");
        }

        if (twilioProperties.getAccountSid() == null || twilioProperties.getAccountSid().isBlank()
                || twilioProperties.getAuthToken() == null || twilioProperties.getAuthToken().isBlank()
                || twilioProperties.getFromNumber() == null || twilioProperties.getFromNumber().isBlank()) {
            log.error("[Voice/Twilio] Call aborted: Missing Twilio account credentials or From number.");
            throw new RuntimeException("Twilio credentials or From number are not configured. Please check your environment settings.");
        }

        // Validate basic E.164 phone formatting
        if (phoneE164 == null || !phoneE164.matches("^\\+[1-9]\\d{1,14}$")) {
            log.error("[Voice/Twilio] Call aborted: Invalid E.164 format for destination phone: '{}'", phoneE164);
            throw new RuntimeException("Destination phone number " + phoneE164 + " is not in valid E.164 format (+[country][number]).");
        }

        log.info("[Voice/Twilio] Initiating Twilio call from {} to {} (Account SID: {})",
                twilioProperties.getFromNumber(), phoneE164, twilioProperties.getAccountSid());

        try {
            Twilio.init(twilioProperties.getAccountSid(), twilioProperties.getAuthToken());
            Call call = Call.creator(
                    new PhoneNumber(phoneE164),
                    new PhoneNumber(twilioProperties.getFromNumber()),
                    new com.twilio.type.Twiml(twimlText)
            ).create();
            log.info("[Voice/Twilio] Twilio Call placed successfully. SID: {}, Status: {}", call.getSid(), call.getStatus());
            return call.getSid();
        } catch (com.twilio.exception.ApiException e) {
            int code = e.getCode();
            log.error("[Voice/Twilio] Twilio API Exception placing call to {} (Error Code: {}, HTTP Status: {}): {}",
                    phoneE164, code, e.getStatusCode(), e.getMessage());

            if (code == 21608) {
                throw new RuntimeException("Twilio Trial Restriction: The phone number " + phoneE164 + " is not verified in your Twilio Console. Please add it to your Verified Caller IDs.", e);
            } else if (code == 21211) {
                throw new RuntimeException("Twilio Error: The destination number " + phoneE164 + " is not a valid phone number or cannot be routed.", e);
            } else if (code == 20003) {
                throw new RuntimeException("Twilio Authentication Failure: The Account SID or Auth Token is invalid. Check configuration.", e);
            } else if (code == 21614) {
                throw new RuntimeException("Twilio Trial Restriction: Cannot route call. The destination number " + phoneE164 + " has not been verified.", e);
            } else {
                throw new RuntimeException("Twilio API Error (Code " + code + "): " + e.getMessage(), e);
            }
        } catch (Exception e) {
            log.error("[Voice/Twilio] Unexpected error initiating Twilio call to {}: {}", phoneE164, e.getMessage(), e);
            throw new RuntimeException("Unexpected failure during Twilio call execution: " + e.getMessage(), e);
        }
    }
}
