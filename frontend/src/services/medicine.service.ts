import { fetchWithAuth } from '@/lib/api';
import type { DoseLog, DoseLogRequest, Medicine } from '@/lib/types';

export const medicineService = {
  async getMyMedicines(): Promise<Medicine[]> {
    return fetchWithAuth<Medicine[]>('/medicines');
  },

  async getMedicine(id: number | string): Promise<Medicine> {
    return fetchWithAuth<Medicine>(`/medicines/${id}`);
  },

  async createMedicine(data: Record<string, unknown>): Promise<Medicine> {
    return fetchWithAuth<Medicine>('/medicines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMedicine(id: number | string, data: Record<string, unknown>): Promise<Medicine> {
    return fetchWithAuth<Medicine>(`/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteMedicine(id: number | string): Promise<void> {
    return fetchWithAuth<void>(`/medicines/${id}`, {
      method: 'DELETE',
    });
  },

  async logDose(data: DoseLogRequest) {
    return fetchWithAuth('/doses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMedicineLogs(medicineId: number | string): Promise<DoseLog[]> {
    return fetchWithAuth<DoseLog[]>(`/doses/${medicineId}`);
  },

  async getDoseHistory(): Promise<DoseLog[]> {
    return fetchWithAuth<DoseLog[]>('/doses/history');
  },
};
