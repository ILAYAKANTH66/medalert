package com.medalert.dto;

import lombok.Data;

@Data
public class NotificationAcknowledgeRequest {
    private Long medicineId;
    private String reminderDate;
    private String reminderTime;
}
