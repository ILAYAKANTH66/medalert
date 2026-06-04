package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DoseTimelineItem {
    private Long medicineId;
    private String medicineName;
    private String dosage;
    private Boolean beforeFood;
    /** HH:mm */
    private String reminderTime;
    private String status; // TAKEN, SKIPPED, MISSED, UPCOMING
    /** HH:mm or null */
    private String takenTime;
}
