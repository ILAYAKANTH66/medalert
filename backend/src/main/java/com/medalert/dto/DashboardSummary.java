package com.medalert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummary {
    private Integer todayMedicinesTaken;
    private Integer upcomingDoses;
    private Double adherencePercentage;
    private List<MedicineResponse> activeMedicines;
    
    // Advanced dynamic metrics
    private List<DoseTimelineItem> todayTimeline;
    private List<AdherenceMetric> weeklyAdherence;
    private List<DoseLogResponse> recentActivity;
}

