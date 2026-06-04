package com.medalert.scheduler;

import com.medalert.model.NotificationLog;
import com.medalert.repository.NotificationLogRepository;
import com.medalert.service.NotificationEscalationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Component
@RequiredArgsConstructor
@Slf4j
public class EscalationScheduler {

    private final NotificationLogRepository notificationLogRepository;
    private final NotificationEscalationService notificationEscalationService;
    private final ReentrantLock voiceJobLock = new ReentrantLock();

    @Scheduled(fixedRate = 60_000)
    public void processVoiceEscalations() {
        if (!voiceJobLock.tryLock()) {
            log.debug("[Scheduler] Voice job already running, skipping tick");
            return;
        }
        try {
            List<NotificationLog> pending = notificationLogRepository.findPendingVoiceCalls();
            for (NotificationLog entry : pending) {
                try {
                    notificationEscalationService.processVoiceEscalation(entry);
                } catch (Exception ex) {
                    log.error("[Scheduler] Voice escalation failed for log {}", entry.getId(), ex);
                }
            }
        } finally {
            voiceJobLock.unlock();
        }
    }
}
