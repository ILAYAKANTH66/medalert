import { fetchPublic, fetchWithAuth } from '@/lib/api';
import type { UserProfile } from '@/lib/types';

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    return fetchPublic<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(registrationData: {
    name: string;
    email: string;
    password: string;
    role: string;
    caretakerToken?: string;
  }): Promise<AuthResponse> {
    return fetchPublic<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
  },

  async getMe(): Promise<UserProfile> {
    return fetchWithAuth<UserProfile>('/auth/me');
  },
};
