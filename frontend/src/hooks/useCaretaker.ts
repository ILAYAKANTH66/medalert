import { useState, useCallback } from 'react';
import { caretakerService } from '@/services/caretaker.service';
import type { DashboardSummary, DoseLog, Medicine, UserProfile } from '@/lib/types';

export function useCaretaker() {
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [patientDashboard, setPatientDashboard] = useState<DashboardSummary | null>(null);
  const [patientMedicines, setPatientMedicines] = useState<Medicine[]>([]);
  const [patientLogs, setPatientLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkPatient = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const newPatient = await caretakerService.linkPatient(token);
      setPatients((prev) => [...prev, newPatient]);
      return newPatient;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link patient';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await caretakerService.getLinkedPatients();
      setPatients(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatientDashboard = useCallback(async (patientId: number | string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await caretakerService.getPatientDashboard(patientId);
      setPatientDashboard(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch patient dashboard';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatientMedicines = useCallback(async (patientId: number | string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await caretakerService.getPatientMedicines(patientId);
      setPatientMedicines(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patient medicines');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatientLogs = useCallback(
    async (patientId: number | string, medicineId: number | string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await caretakerService.getPatientMedicineLogs(patientId, medicineId);
        setPatientLogs(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch patient logs');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    patients,
    patientDashboard,
    patientMedicines,
    patientLogs,
    loading,
    error,
    linkPatient,
    fetchPatients,
    fetchPatientDashboard,
    fetchPatientMedicines,
    fetchPatientLogs,
  };
}
