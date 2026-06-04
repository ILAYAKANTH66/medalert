import { fetchWithAuth } from '@/lib/api';
import type { NotificationLogEntry, PendingNotificationAction } from '@/lib/types';

export interface NotificationEventPayload {
  medicineId: number;
  reminderDate: string;
  reminderTime: string;
  medicineName: string;
  dosage: string;
}

export const notificationsService = {
  async registerLevel1(payload: NotificationEventPayload) {
    return fetchWithAuth('/notifications/level1', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async markLevel2Sent(payload: NotificationEventPayload) {
    return fetchWithAuth('/notifications/level2', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async acknowledge(payload: {
    medicineId: number;
    reminderDate: string;
    reminderTime: string;
  }) {
    return fetchWithAuth('/notifications/acknowledge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPendingActions(): Promise<PendingNotificationAction[]> {
    const result = await fetchWithAuth<PendingNotificationAction[]>('/notifications/pending-actions');
    return result ?? [];
  },

  async getHistory(): Promise<NotificationLogEntry[]> {
    const result = await fetchWithAuth<NotificationLogEntry[]>('/notifications/history');
    return result ?? [];
  },

  async testNotification(): Promise<{ message: string }> {
    return fetchWithAuth('/notifications/test', { method: 'POST' });
  },
};
