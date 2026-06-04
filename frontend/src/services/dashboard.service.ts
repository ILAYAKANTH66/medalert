import { fetchWithAuth } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    return fetchWithAuth<DashboardSummary>('/dashboard');
  },
};
