package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineRequest {
    private String medicineName;
    private String dosage;
    private Integer stockCount;
    private Boolean beforeFood;
    private Integer dailyFrequency;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<String> reminderTimes;
}
