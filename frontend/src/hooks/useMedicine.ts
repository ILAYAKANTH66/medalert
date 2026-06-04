import { useState, useCallback } from 'react';
import { medicineService } from '@/services/medicine.service';
import { ApiError } from '@/lib/api';
import type { DoseLog, DoseLogRequest, Medicine } from '@/lib/types';
import { usePatientApp } from '@/providers/PatientAppProvider';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useMedicine() {
  const { syncSchedules } = usePatientApp();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [currentMedicine, setCurrentMedicine] = useState<Medicine | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [history, setHistory] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicineService.getMyMedicines();
      setMedicines(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch medicines'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMedicine = useCallback(async (id: number | string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicineService.getMedicine(id);
      setCurrentMedicine(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch medicine'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createMedicine = useCallback(async (medicineData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const newMed = await medicineService.createMedicine(medicineData);
      setMedicines((prev) => [...prev, newMed]);
      syncSchedules();
      return newMed;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create medicine'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMedicine = useCallback(
    async (id: number | string, medicineData: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await medicineService.updateMedicine(id, medicineData);
        setMedicines((prev) => prev.map((med) => (med.id === id ? updated : med)));
        if (currentMedicine && currentMedicine.id === id) {
          setCurrentMedicine(updated);
        }
        syncSchedules();
        return updated;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to update medicine'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentMedicine]
  );

  const deleteMedicine = useCallback(async (id: number | string) => {
    setLoading(true);
    setError(null);
    try {
      await medicineService.deleteMedicine(id);
      setMedicines((prev) => prev.filter((med) => med.id !== id));
      syncSchedules();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete medicine'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logDose = useCallback(
    async (data: DoseLogRequest) => {
      setLoading(true);
      setError(null);
      try {
        const log = (await medicineService.logDose(data)) as DoseLog;
        if (currentMedicine && currentMedicine.id === data.medicineId) {
          setLogs((prev) => {
            const exists = prev.some(
              (l) => l.date === data.date && l.reminderTime === data.reminderTime
            );
            if (exists) {
              return prev.map((l) =>
                l.date === data.date && l.reminderTime === data.reminderTime ? log : l
              );
            }
            return [...prev, log];
          });
        }
        return log;
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to log dose'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentMedicine]
  );

  const fetchMedicineLogs = useCallback(async (medicineId: number | string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicineService.getMedicineLogs(medicineId);
      setLogs(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch logs'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDoseHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicineService.getDoseHistory();
      setHistory(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch dose history'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    medicines,
    currentMedicine,
    logs,
    history,
    loading,
    error,
    fetchMedicines,
    fetchMedicine,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    logDose,
    fetchMedicineLogs,
    fetchDoseHistory,
  };
}
