// MedAlert Service Worker — escalation-aware dose reminders
// v5: action buttons (TAKEN/SKIP/SNOOZE), deep-link click, ±2-min window, live interval refresh
const DB_NAME = 'MedAlertDB';
const DB_VERSION = 5;
const STORE_NAME = 'schedules';
const PENDING_STORE = 'pending_alarms';
const HISTORY_STORE = 'notification_history';
const PREFS_STORE = 'prefs';

// Snooze durations keyed by the number of snoozes already applied (capped at 3)
const SNOOZE_MINUTES = [5, 10, 15];

let clientPrefs = {
  silentMode: false,
  browserEnabled: true,
  reminderFrequencyMinutes: 1,
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim().then(startReminderLoops));
});

self.addEventListener('message', async (event) => {
  if (!event.data) return;
  const { type } = event.data;

  if (type === 'SYNC_SCHEDULES') {
    await saveSchedulesToIndexedDB(event.data.schedules || []);
  }

  if (type === 'SYNC_PREFS') {
    const newPrefs = { ...clientPrefs, ...event.data.prefs };
    const intervalChanged =
      newPrefs.reminderFrequencyMinutes !== clientPrefs.reminderFrequencyMinutes;
    clientPrefs = newPrefs;
    await savePrefsToIndexedDB(clientPrefs);
    // Restart repeat loop only when the interval actually changed
    if (intervalChanged) restartRepeatLoop();
  }

  if (type === 'DOSE_ACTIONED') {
    const { medicineId, reminderTime, date } = event.data;
    const key = buildPendingKey(medicineId, reminderTime, date);
    await clearPendingAlarm(key);
    await markDoseActioned(key);
  }

  if (type === 'SHOW_LEVEL2' && event.data.item) {
    await showLevel2Notification(
      event.data.item,
      buildPendingKey(
        event.data.item.medicineId,
        event.data.item.reminderTime,
        event.data.item.reminderDate || todayStr()
      )
    );
  }
});

// ─── Loop management ───────────────────────────────────────────────────────────
let scheduleCheckId = null;
let repeatCheckId = null;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function startReminderLoops() {
  if (scheduleCheckId) clearInterval(scheduleCheckId);
  if (repeatCheckId) clearInterval(repeatCheckId);
  loadPrefsFromIndexedDB().catch(() => {});

  // Schedule check every 30 s (catches any minute boundary within ±2 min window)
  scheduleCheckId = setInterval(() => checkScheduledReminders().catch(console.error), 30_000);
  startRepeatLoop();
}

function startRepeatLoop() {
  if (repeatCheckId) clearInterval(repeatCheckId);
  const repeatMs = Math.max(30_000, (clientPrefs.reminderFrequencyMinutes || 1) * 60_000);
  repeatCheckId = setInterval(() => repeatPendingReminders().catch(console.error), repeatMs);
}

function restartRepeatLoop() {
  startRepeatLoop();
}

function buildPendingKey(medicineId, reminderTime, date) {
  return `${medicineId}-${reminderTime}-${date}`;
}

// ─── Schedule check (±2-minute window) ────────────────────────────────────────
async function checkScheduledReminders() {
  if (clientPrefs.silentMode || !clientPrefs.browserEnabled) return;

  const schedules = await getSchedulesFromIndexedDB();
  if (!schedules.length) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = todayStr();

  for (const item of schedules) {
    const [schedHour, schedMin] = String(item.reminderTime).split(':').map(Number);
    const schedMinutes = schedHour * 60 + schedMin;

    // Fire within a ±2-minute window of the scheduled time
    if (Math.abs(nowMinutes - schedMinutes) > 2) continue;

    const key = buildPendingKey(item.medicineId, item.reminderTime, today);
    if (await checkDoseActioned(key)) continue;

    const existing = await getPendingAlarm(key);
    if (!existing) {
      await addPendingAlarm(key, item);
      await showLevel1Notification(item, key);
      notifyClients({ type: 'REMINDER_FIRED', item });
    }
  }
}

async function repeatPendingReminders() {
  if (clientPrefs.silentMode || !clientPrefs.browserEnabled) return;
  const pending = await getAllPendingAlarms();
  const now = Date.now();
  for (const alarm of pending) {
    const { key, item, snoozeUntil } = alarm;
    if (await checkDoseActioned(key)) continue;
    if (snoozeUntil && now < snoozeUntil) continue;

    const repeatMs = Math.max(30_000, (clientPrefs.reminderFrequencyMinutes || 1) * 60_000);
    const lastShown = alarm.lastShownAt || 0;
    if (!snoozeUntil && lastShown > 0 && now - lastShown < repeatMs) {
      continue;
    }

    await showLevel1Notification(item, key);

    // Update lastShownAt and reset snoozeUntil
    await addPendingAlarm(key, {
      ...item,
      _snoozeCount: alarm.snoozeCount,
      _snoozeUntil: 0,
      _lastShownAt: now,
    });
  }
}

// ─── Notification display ─────────────────────────────────────────────────────
async function showLevel1Notification(item, tagKey) {
  await self.registration.showNotification(`Time for ${item.medicineName}`, {
    body: `${item.dosage} — tap an action or open MedAlert.`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      dosage: item.dosage,
      reminderTime: item.reminderTime,
      reminderDate: item.reminderDate || todayStr(),
      level: 1,
      tagKey,
    },
    tag: `medalert-l1-${tagKey}`,
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'taken', title: '✅ Taken' },
      { action: 'skip',  title: '⏭ Skip'  },
      { action: 'snooze', title: '⏰ Snooze' },
    ],
  });
}

async function showLevel2Notification(item, tagKey) {
  await self.registration.showNotification('MedAlert — Urgent dose reminder', {
    body: `Second reminder: ${item.medicineName} (${item.dosage}). Please respond now or a voice call may follow.`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [300, 100, 300, 100, 300],
    data: {
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      dosage: item.dosage,
      reminderTime: item.reminderTime,
      reminderDate: item.reminderDate || todayStr(),
      level: 2,
      tagKey,
    },
    tag: `medalert-l2-${tagKey}`,
    requireInteraction: true,
    renotify: true,
    actions: [
      { action: 'taken', title: '✅ Taken' },
      { action: 'skip',  title: '⏭ Skip'  },
    ],
  });
}

async function showSnoozeConfirmNotification(item, snoozeMin) {
  await self.registration.showNotification(`Snoozed for ${snoozeMin} min`, {
    body: `We'll remind you about ${item.medicineName} again at that time.`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: `medalert-snooze-${item.medicineId}`,
    silent: true,
  });
}

async function logDoseFromSW(medicineId, status, reminderTime, reminderDate) {
  await loadPrefsFromIndexedDB();
  const token = clientPrefs.token;
  const apiUrl =
  clientPrefs.apiUrl ||
  'https://efficient-forgiveness-production.up.railway.app/api';

  if (!token) {
    console.error('[SW] Cannot log dose: No auth token found.');
    return false;
  }

  const now = new Date();
  const dateStr = reminderDate || now.toISOString().split('T')[0];
  const timeStr = reminderTime || now.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);
  const takenTimeStr = status === 'TAKEN' ? now.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5) : undefined;

  try {
    const doseResponse = await fetch(`${apiUrl}/doses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        medicineId: Number(medicineId),
        status,
        date: dateStr,
        reminderTime: timeStr,
        takenTime: takenTimeStr,
      }),
    });

    if (!doseResponse.ok) {
      throw new Error(`Dose log request failed: ${doseResponse.status}`);
    }

    const ackResponse = await fetch(`${apiUrl}/notifications/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        medicineId: Number(medicineId),
        reminderDate: dateStr,
        reminderTime: timeStr,
      }),
    });

    if (!ackResponse.ok) {
      console.warn(`[SW] Notification acknowledgement request failed: ${ackResponse.status}`);
    }

    console.log('[SW] Dose successfully logged & acknowledged directly from SW.');
    return true;
  } catch (err) {
    console.error('[SW] Direct dose log failed:', err);
    try {
      const db = await openDB();
      const tx = db.transaction('pendingNotificationActions', 'readwrite');
      tx.objectStore('pendingNotificationActions').put({
        medicineId: Number(medicineId),
        status,
        date: dateStr,
        reminderTime: timeStr,
      });
      console.log('[SW] Queued action for offline sync.');
    } catch (e) {
      console.error('[SW] Failed to queue offline action:', e);
    }
    return false;
  }
}

// ─── Notification click & action handler ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const data = event.notification.data || {};
  const { medicineId, reminderTime, reminderDate, tagKey, medicineName, dosage } = data;

  event.notification.close();

  if (action === 'taken' || action === 'skip') {
    const status = action === 'taken' ? 'TAKEN' : 'SKIPPED';
    event.waitUntil(
      (async () => {
        // Mark locally so SW stops repeating
        if (tagKey) {
          await clearPendingAlarm(tagKey);
          await markDoseActioned(tagKey);
        }

        // Direct log to backend via SW fetch
        await logDoseFromSW(medicineId, status, reminderTime, reminderDate);

        // Notify all open clients so the dashboard can refresh
        notifyClients({
          type: 'NOTIFICATION_ACTION',
          action: status,
          medicineId,
          medicineName,
          dosage,
          reminderTime,
          reminderDate,
        });

        // Focus or navigate matched client windows
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const url = `/dashboard?medicineId=${medicineId}&action=${status}&time=${encodeURIComponent(reminderTime)}&date=${encodeURIComponent(reminderDate)}`;
        
        let focused = false;
        for (const client of clients) {
          if (new URL(client.url).pathname.startsWith('/dashboard')) {
            await client.navigate(url);
            await client.focus();
            focused = true;
            break;
          }
        }
        if (!focused && clients.length) {
          await clients[0].navigate(url);
          await clients[0].focus();
          focused = true;
        }
        if (!focused) {
          await self.clients.openWindow(url);
        }
      })()
    );
    return;
  }

  if (action === 'snooze') {
    event.waitUntil(
      (async () => {
        const alarm = tagKey ? await getPendingAlarm(tagKey) : null;
        const snoozeCount = alarm?.snoozeCount ?? 0;
        const snoozeMin = SNOOZE_MINUTES[Math.min(snoozeCount, SNOOZE_MINUTES.length - 1)];

        const snoozeMs = snoozeMin * 60_000;
        const snoozeUntil = Date.now() + snoozeMs;

        if (alarm) {
          await addPendingAlarm(tagKey, {
            ...alarm.item,
            _snoozeCount: snoozeCount + 1,
            _snoozeUntil: snoozeUntil,
            _lastShownAt: Date.now()
          });
        }

        await showSnoozeConfirmNotification({ medicineName }, snoozeMin);
      })()
    );
    return;
  }

  // Bare notification body tap — deep-link to dashboard
  event.waitUntil(
    (async () => {
      const url = medicineId
        ? `/dashboard?medicineId=${medicineId}`
        : '/dashboard';

      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        if (new URL(client.url).pathname.startsWith('/dashboard')) {
          await client.navigate(url);
          await client.focus();
          return;
        }
      }
      if (clients.length) {
        await clients[0].navigate(url);
        await clients[0].focus();
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  // No-op — user dismissed; repeat loop will re-surface if needed
});

function notifyClients(message) {
  self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
    clients.forEach((c) => c.postMessage(message));
  });
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE);
      }
      if (!db.objectStoreNames.contains(PREFS_STORE)) {
        db.createObjectStore(PREFS_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pendingNotificationActions')) {
        db.createObjectStore('pendingNotificationActions', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePrefsToIndexedDB(prefs) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PREFS_STORE, 'readwrite');
    tx.objectStore(PREFS_STORE).put({ key: 'main', ...prefs });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadPrefsFromIndexedDB() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(PREFS_STORE, 'readonly');
    const req = tx.objectStore(PREFS_STORE).get('main');
    req.onsuccess = () => {
      if (req.result) clientPrefs = { ...clientPrefs, ...req.result };
      resolve(clientPrefs);
    };
    req.onerror = () => resolve(clientPrefs);
  });
}

async function saveSchedulesToIndexedDB(schedules) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    schedules.forEach((item) => store.put({ id: `${item.medicineId}-${item.reminderTime}`, ...item }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSchedulesFromIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function addPendingAlarm(key, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).put({
      key,
      item,
      snoozeCount: item._snoozeCount ?? 0,
      snoozeUntil: item._snoozeUntil ?? 0,
      lastShownAt: item._lastShownAt ?? Date.now()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearPendingAlarm(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllPendingAlarms() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const req = tx.objectStore(PENDING_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingAlarm(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const req = tx.objectStore(PENDING_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function checkDoseActioned(historyKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, 'readonly');
    const req = tx.objectStore(HISTORY_STORE).get(historyKey);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => reject(req.error);
  });
}

async function markDoseActioned(historyKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).put(true, historyKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
