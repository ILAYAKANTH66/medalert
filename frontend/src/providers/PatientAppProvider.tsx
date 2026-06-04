"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { preferencesService } from '@/services/preferences.service';
import { notificationsService, type NotificationEventPayload } from '@/services/notifications.service';
import { medicineService } from '@/services/medicine.service';
import { ApiError } from '@/lib/api';
import type { UserPreferences } from '@/lib/types';

const DEFAULT_PREFS: UserPreferences = {
  browserNotificationsEnabled: true,
  voiceEscalationEnabled: false,
  silentMode: false,
  escalationDelayMinutes: 5,
  voiceEscalationDelayMinutes: 5,
  reminderFrequencyMinutes: 1,
  voiceProvider: 'TWILIO',
  maxVoiceCallAttempts: 1,
};

const POLL_MS = 45_000;
const DB_NAME = 'MedAlertDB';
const DB_VERSION = 5;
const STORE_NAME = 'schedules';
const PENDING_STORE = 'pending_alarms';
const HISTORY_STORE = 'notification_history';

interface PatientAppContextValue {
  preferences: UserPreferences;
  preferencesLoading: boolean;
  preferencesError: string | null;
  savePreferences: (updates: Partial<UserPreferences>) => Promise<UserPreferences>;
  testVoiceCall: () => Promise<{ message: string; callSid: string }>;
  permission: NotificationPermission;
  pendingCount: number;
  requestPermission: () => Promise<NotificationPermission>;
  syncSchedules: () => Promise<void>;
  processEscalationActions: () => Promise<void>;
  logDoseFromNotification: (medicineId: number, status: 'TAKEN' | 'SKIPPED', reminderTime?: string, reminderDate?: string) => Promise<void>;
}

const PatientAppContext = createContext<PatientAppContextValue | null>(null);

const openIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE);
      }
      if (!db.objectStoreNames.contains('prefs')) {
        db.createObjectStore('prefs', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pendingNotificationActions')) {
        db.createObjectStore('pendingNotificationActions', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const getFromStore = <T,>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> => {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
};

const putToStore = (db: IDBDatabase, storeName: string, val: any): Promise<void> => {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(val);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

const getAllFromStore = <T,>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
};

interface OfflineAction {
  id?: number;
  medicineId: number;
  status: 'TAKEN' | 'SKIPPED';
  date: string;
  reminderTime: string;
}

export function PatientAppProvider({ children }: { children: React.ReactNode }) {
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const isPatient = user?.role === 'PATIENT' && isAuthenticated;
  const isCaretaker = user?.role === 'CARETAKER' && isAuthenticated;

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pendingCount, setPendingCount] = useState(0);
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const processedLevel2 = useRef<Set<string>>(new Set());
  const swRegistered = useRef(false);
  const pollStarted = useRef(false);

  const loadPreferences = useCallback(async () => {
    if (!isPatient && !isCaretaker) return;
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      const prefs = await preferencesService.get();
      setPreferences({ ...DEFAULT_PREFS, ...prefs });
    } catch {
      setPreferences({ ...DEFAULT_PREFS });
      setPreferencesError(null);
    } finally {
      setPreferencesLoading(false);
    }
  }, [isPatient, isCaretaker]);

  const savePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    const updated = await preferencesService.update(updates);
    setPreferences({ ...DEFAULT_PREFS, ...updated });
    return updated;
  }, []);

  const syncPrefsToSW = useCallback(() => {
    swRegistration.current?.active?.postMessage({
      type: 'SYNC_PREFS',
      prefs: {
        silentMode: preferences.silentMode,
        browserEnabled: preferences.browserNotificationsEnabled,
        reminderFrequencyMinutes: preferences.reminderFrequencyMinutes,
        token: token || null,
        apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'https://medalert-production.up.railway.app/api',
      },
    });
  }, [preferences, token]);

  const registerLevel1 = useCallback(async (item: NotificationEventPayload) => {
    if (preferences.silentMode || !preferences.browserNotificationsEnabled) return;
    try {
      await notificationsService.registerLevel1(item);
    } catch {
      /* non-blocking */
    }
  }, [preferences]);

  const logDoseFromNotification = useCallback(async (
    medicineId: number,
    status: 'TAKEN' | 'SKIPPED',
    reminderTime?: string,
    reminderDate?: string
  ) => {
    const now = new Date();
    const dateStr = reminderDate || now.toISOString().split('T')[0];
    const timeStr = reminderTime || now.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);

    try {
      await medicineService.logDose({
        medicineId,
        status,
        date: dateStr,
        reminderTime: timeStr,
        takenTime: status === 'TAKEN' ? now.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5) : undefined,
      });

      await notificationsService.acknowledge({
        medicineId,
        reminderDate: dateStr,
        reminderTime: timeStr,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        try {
          const db = await openIDB();
          await putToStore(db, 'pendingNotificationActions', {
            medicineId,
            status,
            date: dateStr,
            reminderTime: timeStr,
          });
        } catch {
          /* best effort */
        }
      }
    }
  }, []);

  const processEscalationActions = useCallback(async () => {
    if (!isPatient || preferences.silentMode) {
      setPendingCount(0);
      return;
    }
    try {
      const actions = await notificationsService.getPendingActions();
      setPendingCount(actions?.length ?? 0);

      for (const action of actions ?? []) {
        if (action.actionType !== 'LEVEL2_PUSH') continue;
        const key = `${action.medicineId}-${action.reminderTime}-${action.reminderDate}`;
        if (processedLevel2.current.has(key)) continue;
        processedLevel2.current.add(key);

        const payload: NotificationEventPayload = {
          medicineId: action.medicineId,
          medicineName: action.medicineName,
          dosage: action.dosage,
          reminderDate: action.reminderDate,
          reminderTime: action.reminderTime,
        };

        swRegistration.current?.active?.postMessage({ type: 'SHOW_LEVEL2', item: payload });

        try {
          await notificationsService.markLevel2Sent(payload);
        } catch {
          processedLevel2.current.delete(key);
        }
      }
    } catch {
      setPendingCount(0);
    }
  }, [isPatient, preferences.silentMode]);

  const processOfflineActions = useCallback(async () => {
    if (!isPatient) return;
    try {
      const db = await openIDB();
      const actions = await getAllFromStore<OfflineAction>(db, 'pendingNotificationActions');
      if (actions.length === 0) return;

      for (const action of actions) {
        try {
          await medicineService.logDose({
            medicineId: action.medicineId,
            status: action.status,
            date: action.date,
            reminderTime: action.reminderTime,
            takenTime: action.status === 'TAKEN' ? action.reminderTime : undefined,
          });

          await notificationsService.acknowledge({
            medicineId: action.medicineId,
            reminderDate: action.date,
            reminderTime: action.reminderTime,
          });

          const tx = db.transaction('pendingNotificationActions', 'readwrite');
          tx.objectStore('pendingNotificationActions').delete(action.id!);
        } catch (err) {
          if (err instanceof ApiError && err.status === 0) {
            continue;
          }
          const tx = db.transaction('pendingNotificationActions', 'readwrite');
          tx.objectStore('pendingNotificationActions').delete(action.id!);
        }
      }
    } catch {
      /* ignore */
    }
  }, [isPatient]);

  const runReminderScheduler = useCallback(async () => {
    if (!isPatient || preferences.silentMode || !preferences.browserNotificationsEnabled) return;
    try {
      const db = await openIDB();
      const schedules = await getAllFromStore<any>(db, STORE_NAME);
      if (schedules.length === 0) return;

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const today = now.toISOString().split('T')[0];

      // 1. Check scheduled alarms
      for (const item of schedules) {
        const [schedHour, schedMin] = String(item.reminderTime).split(':').map(Number);
        const schedMinutes = schedHour * 60 + schedMin;

        if (Math.abs(nowMinutes - schedMinutes) > 2) continue;

        const key = `${item.medicineId}-${item.reminderTime}-${today}`;

        const actioned = await getFromStore<boolean>(db, HISTORY_STORE, key);
        if (actioned) continue;

        const pending = await getFromStore<any>(db, PENDING_STORE, key);
        if (pending) continue;

        // Initialize pending alarm with lastShownAt = now
        await putToStore(db, PENDING_STORE, { key, item, snoozeCount: 0, lastShownAt: Date.now() });

        const reg = await navigator.serviceWorker?.ready;
        if (reg && 'Notification' in window && Notification.permission === 'granted') {
          await reg.showNotification(`Time for ${item.medicineName}`, {
            body: `${item.dosage} — tap an action or open MedAlert.`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
              medicineId: item.medicineId,
              medicineName: item.medicineName,
              dosage: item.dosage,
              reminderTime: item.reminderTime,
              reminderDate: today,
              level: 1,
              tagKey: key,
            },
            tag: `medalert-l1-${key}`,
            requireInteraction: true,
            renotify: true,
            actions: [
              { action: 'taken', title: '✅ Taken' },
              { action: 'skip',  title: '⏭ Skip'  },
              { action: 'snooze', title: '⏰ Snooze' },
            ],
          } as any);
        }

        try {
          await notificationsService.registerLevel1({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            dosage: item.dosage,
            reminderTime: item.reminderTime,
            reminderDate: today,
          });
        } catch {
          /* best effort */
        }
      }

      // 2. Check pending/snoozed alarms for repeating/re-triggering
      const pendingAlarms = await getAllFromStore<any>(db, PENDING_STORE);
      const nowMs = Date.now();
      for (const alarm of pendingAlarms) {
        const { key, item, snoozeUntil, snoozeCount, lastShownAt } = alarm;
        const actioned = await getFromStore<boolean>(db, HISTORY_STORE, key);
        if (actioned) {
          const tx = db.transaction(PENDING_STORE, 'readwrite');
          tx.objectStore(PENDING_STORE).delete(key);
          continue;
        }

        // If snoozeUntil is set and has not elapsed, skip
        if (snoozeUntil && nowMs < snoozeUntil) {
          continue;
        }

        const repeatMs = Math.max(30_000, (preferences.reminderFrequencyMinutes || 1) * 60_000);
        const lastShown = lastShownAt || 0;

        let shouldShow = false;
        if (snoozeUntil && nowMs >= snoozeUntil) {
          shouldShow = true;
        } else if (!snoozeUntil) {
          if (lastShown === 0 || nowMs - lastShown >= repeatMs) {
            shouldShow = true;
          }
        }

        if (shouldShow) {
          const reg = await navigator.serviceWorker?.ready;
          if (reg && 'Notification' in window && Notification.permission === 'granted') {
            const isL2 = key.includes('-l2-') || alarm.level === 2;
            await reg.showNotification(`Time for ${item.medicineName}${snoozeUntil ? ' (Snoozed)' : ''}`, {
              body: `${item.dosage} — tap an action or open MedAlert.`,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              data: {
                medicineId: item.medicineId,
                medicineName: item.medicineName,
                dosage: item.dosage,
                reminderTime: item.reminderTime,
                reminderDate: item.reminderDate || today,
                level: isL2 ? 2 : 1,
                tagKey: key,
              },
              tag: `medalert-${isL2 ? 'l2' : 'l1'}-${key}`,
              requireInteraction: true,
              renotify: true,
              actions: isL2 ? [
                { action: 'taken', title: '✅ Taken' },
                { action: 'skip',  title: '⏭ Skip'  },
              ] : [
                { action: 'taken', title: '✅ Taken' },
                { action: 'skip',  title: '⏭ Skip'  },
                { action: 'snooze', title: '⏰ Snooze' },
              ],
            } as any);
          }

          // Update the alarm record state to prevent double triggers
          const updatedAlarm = {
            ...alarm,
            snoozeUntil: 0, // Reset manual snooze state once triggered
            lastShownAt: nowMs,
          };
          await putToStore(db, PENDING_STORE, updatedAlarm);
        }
      }
    } catch {
      /* ignore */
    }
  }, [isPatient, preferences.silentMode, preferences.browserNotificationsEnabled, preferences.reminderFrequencyMinutes]);

  const syncSchedules = useCallback(async () => {
    if (!isPatient) return;
    try {
      const medicines = await medicineService.getMyMedicines();
      const flatSchedules: NotificationEventPayload[] = [];
      const getLocalDateString = (d: Date = new Date()) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const today = getLocalDateString();
      medicines.forEach((med) => {
        if (med.isActive && med.schedules?.length) {
          med.schedules.forEach((s) => {
            flatSchedules.push({
              medicineId: med.id,
              medicineName: med.medicineName,
              dosage: med.dosage,
              reminderTime: String(s.reminderTime).slice(0, 5),
              reminderDate: today,
            });
          });
        }
      });

      const db = await openIDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      flatSchedules.forEach((item) => {
        store.put({ id: `${item.medicineId}-${item.reminderTime}`, ...item });
      });

      syncPrefsToSW();
      swRegistration.current?.active?.postMessage({
        type: 'SYNC_SCHEDULES',
        schedules: flatSchedules,
      });
    } catch {
      /* non-blocking */
    }
  }, [isPatient, syncPrefsToSW]);

  useEffect(() => {
    if (!authLoading && (isPatient || isCaretaker)) loadPreferences();
  }, [authLoading, isPatient, isCaretaker, loadPreferences]);

  useEffect(() => {
    if (!authLoading && isPatient && token) {
      openIDB().then((db) => {
        getFromStore<any>(db, 'prefs', 'main').then((existing) => {
          const updated = {
            key: 'main',
            ...(existing || {}),
            token: token,
            apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'https://medalert-production.up.railway.app/api',
          };
          putToStore(db, 'prefs', updated);
        });
      });
    }
  }, [token, authLoading, isPatient]);

  useEffect(() => {
    if (!authLoading && !token) {
      openIDB().then((db) => {
        getFromStore<any>(db, 'prefs', 'main').then((existing) => {
          if (existing) {
            const updated = { ...existing };
            delete updated.token;
            putToStore(db, 'prefs', updated);
          }
        });
      });
    }
  }, [token, authLoading]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isPatient) return;
    if ('Notification' in window) setPermission(Notification.permission);

    if (swRegistered.current) return;
    swRegistered.current = true;

    navigator.serviceWorker?.register('/sw.js').then((reg) => {
      swRegistration.current = reg;
      syncSchedules();
    }).catch(() => {
      swRegistered.current = false;
    });

    const onMessage = (event: MessageEvent) => {
      const { type } = event.data ?? {};

      if (type === 'REMINDER_FIRED' && event.data.item) {
        const item = event.data.item;
        registerLevel1({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          dosage: item.dosage,
          reminderTime: item.reminderTime,
          reminderDate: new Date().toISOString().split('T')[0],
        });
      }

      // User tapped Taken / Skip on the OS notification banner
      if (type === 'NOTIFICATION_ACTION' && event.data.medicineId) {
        const { medicineId, action, reminderTime, reminderDate } = event.data;
        if (action === 'TAKEN' || action === 'SKIPPED') {
          logDoseFromNotification(Number(medicineId), action, reminderTime, reminderDate);
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [isPatient, registerLevel1, syncSchedules]);

  useEffect(() => {
    syncPrefsToSW();
  }, [syncPrefsToSW]);

  useEffect(() => {
    if (!isPatient || pollStarted.current) return;
    pollStarted.current = true;
    processEscalationActions();
    const id = setInterval(processEscalationActions, POLL_MS);
    return () => {
      clearInterval(id);
      pollStarted.current = false;
    };
  }, [isPatient, processEscalationActions]);

  useEffect(() => {
    if (!isPatient) return;

    processOfflineActions();

    const intervalId = setInterval(() => {
      runReminderScheduler();
      processOfflineActions();
    }, 30_000);

    const handleOnline = () => {
      processOfflineActions();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, [isPatient, runReminderScheduler, processOfflineActions]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied' as NotificationPermission;
    const status = await Notification.requestPermission();
    setPermission(status);
    return status;
  }, []);

  const value = useMemo<PatientAppContextValue>(
    () => ({
      preferences,
      preferencesLoading,
      preferencesError,
      savePreferences,
      testVoiceCall: () => preferencesService.testVoiceCall(),
      permission,
      pendingCount,
      requestPermission,
      syncSchedules,
      processEscalationActions,
      logDoseFromNotification,
    }),
    [
      preferences,
      preferencesLoading,
      preferencesError,
      savePreferences,
      permission,
      pendingCount,
      requestPermission,
      syncSchedules,
      processEscalationActions,
      logDoseFromNotification,
    ]
  );

  return (
    <PatientAppContext.Provider value={isAuthenticated ? value : null}>
      {children}
    </PatientAppContext.Provider>
  );
}

export function usePatientApp(): PatientAppContextValue {
  const ctx = useContext(PatientAppContext);
  if (!ctx) {
    return {
      preferences: DEFAULT_PREFS,
      preferencesLoading: false,
      preferencesError: null,
      savePreferences: async (u) => ({ ...DEFAULT_PREFS, ...u }),
      testVoiceCall: async () => ({ message: '', callSid: '' }),
      permission: 'default',
      pendingCount: 0,
      requestPermission: async () => 'default',
      syncSchedules: async () => {},
      processEscalationActions: async () => {},
      logDoseFromNotification: async () => {},
    };
  }
  return ctx;
}
