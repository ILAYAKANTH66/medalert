package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingNotificationActionDto {
    private String actionType;
    private Long medicineId;
    private String medicineName;
    private String dosage;
    private String reminderDate;
    private String reminderTime;
}
