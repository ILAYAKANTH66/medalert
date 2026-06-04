"use client";

import { usePatientApp } from '@/providers/PatientAppProvider';

/** Notifications from centralized PatientAppProvider (single SW + poll). */
export function useNotifications() {
  const {
    permission,
    pendingCount,
    requestPermission,
    syncSchedules,
    processEscalationActions,
  } = usePatientApp();

  return {
    permission,
    pendingCount,
    requestPermission,
    syncSchedules,
    processEscalationActions,
  };
}
