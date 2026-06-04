"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationsService } from "@/services/notifications.service";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import type { NotificationLogEntry } from "@/lib/types";
import { Bell, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { ApiError } from "@/lib/api";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { permission, pendingCount, requestPermission, syncSchedules, processEscalationActions } = useNotifications();
  const [history, setHistory] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const logs = await notificationsService.getHistory();
      setHistory(logs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (!authLoading && user?.role === "CARETAKER") router.push("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === "PATIENT") loadHistory();
  }, [user, loadHistory]);

  if (authLoading) {
    return <LoadingSpinner fullScreen label="Loading..." />;
  }

  return (
    <AppShell title="Notifications" description="Alert history & notification settings">
      <div className="flex flex-col gap-6 max-w-3xl">
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50/50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-teal-600" />
              Notification Status
            </CardTitle>
            <CardDescription>
              We will remind you with a browser notification, and follow up with a phone call if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant={permission === "granted" ? "success" : "warning"}>
              Browser: {permission}
            </Badge>
            <Badge variant={pendingCount > 0 ? "warning" : "info"}>
              Pending Alerts: {pendingCount}
            </Badge>
            {permission !== "granted" && (
              <Button size="sm" onClick={() => requestPermission()}>Enable notifications</Button>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { syncSchedules(); processEscalationActions(); }}>
              <RefreshCw className="h-4 w-4" />
              Sync now
            </Button>
            <Link href="/settings">
              <Button size="sm" variant="ghost" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Alerts</CardTitle>
            <Button size="sm" variant="ghost" onClick={loadHistory}>Refresh</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner label="Loading history..." />
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No alerts yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((log) => (
                  <li key={log.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{log.medicineName}</p>
                      <p className="text-xs text-slate-500">{log.reminderDate} at {log.reminderTime}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {log.notificationSent && <Badge variant="info">L1</Badge>}
                      {log.secondNotificationSent && <Badge variant="warning">L2</Badge>}
                      {log.voiceCallSent && <Badge variant="error">Call</Badge>}
                      {log.acknowledged && <Badge variant="success">Ack</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
