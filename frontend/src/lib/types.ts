export type UserRole = 'PATIENT' | 'CARETAKER';
export type DoseStatus = 'TAKEN' | 'SKIPPED' | 'MISSED' | 'UPCOMING';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  caretakerToken?: string;
}

export interface UserPreferences {
  browserNotificationsEnabled: boolean;
  voiceEscalationEnabled: boolean;
  silentMode: boolean;
  escalationDelayMinutes: number;
  voiceEscalationDelayMinutes: number;
  reminderFrequencyMinutes: number;
  phoneNumber?: string;
  voiceProvider: string;
  maxVoiceCallAttempts?: number;
}

export interface PendingNotificationAction {
  actionType: string;
  medicineId: number;
  medicineName: string;
  dosage: string;
  reminderDate: string;
  reminderTime: string;
}

export interface NotificationLogEntry {
  id: number;
  medicineId: number;
  medicineName: string;
  reminderDate: string;
  reminderTime: string;
  notificationSent: boolean;
  secondNotificationSent: boolean;
  voiceCallSent: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  voiceCallAttempts?: number;
}

export interface ScheduleDto {
  id: number;
  reminderTime: string;
  status: string;
}

export interface Medicine {
  id: number;
  medicineName: string;
  dosage: string;
  stockCount: number;
  beforeFood: boolean;
  dailyFrequency: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  schedules: ScheduleDto[];
  daysRemaining: number | null;
  refillPredictionDate?: string;
  refillWarning: boolean;
}

export interface DoseTimelineItem {
  medicineId: number;
  medicineName: string;
  dosage: string;
  beforeFood: boolean;
  reminderTime: string;
  status: DoseStatus;
  takenTime?: string;
}

export interface AdherenceMetric {
  date: string;
  expectedDoses: number;
  takenDoses: number;
  adherencePercentage: number;
}

export interface DoseLog {
  id: number;
  medicineId: number;
  medicineName: string;
  date: string;
  reminderTime: string;
  status: 'TAKEN' | 'SKIPPED' | 'MISSED';
  takenTime?: string;
}

export interface DashboardSummary {
  todayMedicinesTaken: number;
  upcomingDoses: number;
  adherencePercentage: number;
  activeMedicines: Medicine[];
  todayTimeline: DoseTimelineItem[];
  weeklyAdherence: AdherenceMetric[];
  recentActivity: DoseLog[];
}

export interface DoseLogRequest {
  medicineId: number;
  date: string;
  reminderTime: string;
  status: 'TAKEN' | 'SKIPPED' | 'MISSED';
  takenTime?: string;
}

export interface EmergencyEvent {
  id: number;
  patientId: number;
  patientName: string;
  triggeredAt: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  alertSentToCaretaker: boolean;
  voiceCallTriggered: boolean;
  resolved: boolean;
  resolvedAt?: string;
}

export interface RiskAlert {
  id: number;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  medicineName?: string;
  metricValue?: number;
  thresholdValue?: number;
  createdAt: string;
  acknowledged: boolean;
}

export interface DailyAdherence {
  date: string;
  label: string;
  expected: number;
  taken: number;
  skipped: number;
  missed: number;
  adherencePercentage: number;
}

export interface MedicineStat {
  medicineId: number;
  medicineName: string;
  dosage: string;
  taken: number;
  skipped: number;
  missed: number;
  expected: number;
  adherencePercentage: number;
}

export interface AnalyticsData {
  period: string;
  days: number;
  startDate: string;
  endDate: string;
  overallAdherence: number;
  totalTaken: number;
  totalSkipped: number;
  totalMissed: number;
  totalExpected: number;
  currentStreak: number;
  bestDay?: string;
  worstDay?: string;
  dailyAdherence: DailyAdherence[];
  medicineStats: MedicineStat[];
}
