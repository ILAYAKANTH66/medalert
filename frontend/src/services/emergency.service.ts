import { fetchWithAuth } from '@/lib/api';
import type { EmergencyEvent } from '@/lib/types';

export interface EmergencyRequest {
  lat?: number;
  lng?: number;
  address?: string;
}

export const emergencyService = {
  async triggerEmergency(data?: EmergencyRequest): Promise<EmergencyEvent> {
    return fetchWithAuth<EmergencyEvent>('/emergency/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data ?? {}),
    });
  },

  async resolveEmergency(eventId: number): Promise<EmergencyEvent> {
    return fetchWithAuth<EmergencyEvent>(`/emergency/${eventId}/resolve`, {
      method: 'POST',
    });
  },

  async getRecentEmergencies(): Promise<EmergencyEvent[]> {
    return fetchWithAuth<EmergencyEvent[]>('/emergency');
  },
};
