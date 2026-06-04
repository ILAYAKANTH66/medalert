package com.medalert.dto;

import com.medalert.model.DoseStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoseLogResponse {
    private Long id;
    private Long medicineId;
    private String medicineName;
    private LocalDate date;
    private LocalTime reminderTime;
    private DoseStatus status;
    private LocalTime takenTime;
}

