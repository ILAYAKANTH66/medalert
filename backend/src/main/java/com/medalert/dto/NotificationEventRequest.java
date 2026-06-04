package com.medalert.dto;

import lombok.Data;

@Data
public class NotificationEventRequest {
    private Long medicineId;
    private String reminderDate;
    private String reminderTime;
    private String medicineName;
    private String dosage;
}
