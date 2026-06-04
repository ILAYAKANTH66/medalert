import { fetchWithAuth } from '@/lib/api';
import type { AnalyticsData } from '@/lib/types';

export const analyticsService = {
  async getAnalytics(period: 'weekly' | 'monthly' = 'weekly'): Promise<AnalyticsData> {
    return fetchWithAuth<AnalyticsData>(`/analytics?period=${period}`);
  },
};
