package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdherenceMetric {
    private LocalDate date;
    private Integer expectedDoses;
    private Integer takenDoses;
    private Double adherencePercentage;
}
