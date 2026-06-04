"use client";

import { useState, useCallback } from 'react';
import { usePatientApp } from '@/providers/PatientAppProvider';
import type { UserPreferences } from '@/lib/types';

export function usePreferences() {
  const {
    preferences,
    preferencesLoading: loading,
    preferencesError: error,
    savePreferences,
    testVoiceCall,
  } = usePatientApp();
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (updates: Partial<UserPreferences>) => {
      setSaving(true);
      try {
        return await savePreferences(updates);
      } finally {
        setSaving(false);
      }
    },
    [savePreferences]
  );

  return {
    preferences,
    loading,
    saving,
    error,
    save,
    reload: async () => {},
    testVoiceCall,
  };
}
