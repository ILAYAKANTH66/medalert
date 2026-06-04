import { fetchWithAuth } from '@/lib/api';
import type { DashboardSummary, DoseLog, Medicine, UserProfile } from '@/lib/types';

export const caretakerService = {
  async linkPatient(patientToken: string): Promise<UserProfile> {
    return fetchWithAuth<UserProfile>('/caretaker/link', {
      method: 'POST',
      body: JSON.stringify({ patientToken }),
    });
  },

  async getLinkedPatients(): Promise<UserProfile[]> {
    return fetchWithAuth<UserProfile[]>('/caretaker/patients');
  },

  async getPatientDashboard(patientId: number | string): Promise<DashboardSummary> {
    return fetchWithAuth<DashboardSummary>(`/caretaker/patients/${patientId}/dashboard`);
  },

  async getPatientMedicines(patientId: number | string): Promise<Medicine[]> {
    return fetchWithAuth<Medicine[]>(`/caretaker/patients/${patientId}/medicines`);
  },

  async getPatientMedicineLogs(
    patientId: number | string,
    medicineId: number | string
  ): Promise<DoseLog[]> {
    return fetchWithAuth<DoseLog[]>(
      `/caretaker/patients/${patientId}/medicines/${medicineId}/logs`
    );
  },
};
