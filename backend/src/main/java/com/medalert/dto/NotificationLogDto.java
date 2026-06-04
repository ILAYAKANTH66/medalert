package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationLogDto {
    private Long id;
    private Long medicineId;
    private String medicineName;
    private String reminderDate;
    private String reminderTime;
    private Boolean notificationSent;
    private Boolean secondNotificationSent;
    private Boolean voiceCallSent;
    private Boolean acknowledged;
    private String acknowledgedAt;
    private Integer voiceCallAttempts;
}
