import { fetchWithAuth } from '@/lib/api';
import type { UserPreferences } from '@/lib/types';

export const preferencesService = {
  async get(): Promise<UserPreferences> {
    return fetchWithAuth<UserPreferences>('/preferences');
  },

  async update(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    return fetchWithAuth<UserPreferences>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  async testVoiceCall(): Promise<{ message: string; callSid: string }> {
    return fetchWithAuth('/preferences/test-voice-call', { method: 'POST' });
  },
};
