"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { useNotifications } from "@/hooks/useNotifications";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { FormGroup, Label, Input, Select, FormError } from "@/components/ui/Form";
import { Bell, Phone, Volume2, VolumeX, Clock, TestTube } from "lucide-react";
import { notificationsService } from "@/services/notifications.service";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { preferences, loading, saving, error, save, testVoiceCall } = usePreferences();
  const { permission, requestPermission, syncSchedules } = useNotifications();
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState("");

  useEffect(() => {
    if (preferences?.phoneNumber !== undefined) {
      setLocalPhone(preferences.phoneNumber ?? "");
    }
  }, [preferences?.phoneNumber]);

  useEffect(() => {
    if (!preferences || localPhone === (preferences.phoneNumber ?? "")) return;

    const handler = setTimeout(async () => {
      setTestErr(null);
      try {
        await save({ phoneNumber: localPhone });
      } catch (e) {
        setTestErr(e instanceof Error ? e.message : "Failed to save phone number");
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [localPhone, preferences, save]);

  const handlePhoneBlur = async () => {
    if (!preferences) return;
    if (localPhone !== (preferences.phoneNumber ?? "")) {
      setTestErr(null);
      try {
        await save({ phoneNumber: localPhone });
      } catch (e) {
        setTestErr(e instanceof Error ? e.message : "Failed to save phone number");
      }
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    // Both patients and caretakers can access settings (caretakers set their emergency phone)
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen label="Loading settings..." />;
  }

  const handleToggle = async (field: keyof typeof preferences, value: boolean | number | string) => {
    setTestErr(null);
    try {
      await save({ [field]: value });
      await syncSchedules();
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : "Failed to save setting");
    }
  };

  const handleTestNotification = async () => {
    setTestMsg(null);
    setTestErr(null);
    try {
      if (permission !== "granted") await requestPermission();
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("MedAlert test", {
          body: "Browser notifications are working correctly.",
          icon: "/icon-192x192.png",
        });
      }
      const res = await notificationsService.testNotification();
      setTestMsg(res.message);
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : "Test failed");
    }
  };

  const handleTestVoice = async () => {
    setTestMsg(null);
    setTestErr(null);
    try {
      const res = await testVoiceCall();
      setTestMsg(`Voice call initiated (${res.callSid})`);
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : "Voice test failed");
    }
  };

  return (
    <AppShell title="Settings" description="Notification preferences & contact details">
      <div className="max-w-2xl flex flex-col gap-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {testMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{testMsg}</div>
        )}
        {testErr && <FormError>{testErr}</FormError>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-teal-600" />
              Browser notifications
            </CardTitle>
            <CardDescription>
              {user?.role === "PATIENT"
                ? "Receive timely reminders on this device"
                : "Receive emergency notifications on this device"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm font-medium text-slate-700">Enable browser notifications</span>
              <input
                id="pref-browser"
                name="browserNotificationsEnabled"
                type="checkbox"
                checked={preferences.browserNotificationsEnabled}
                disabled={saving}
                onChange={(e) => handleToggle("browserNotificationsEnabled", e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-teal-600"
              />
            </label>
            <Button type="button" variant="outline" size="sm" className="w-fit gap-2" onClick={handleTestNotification}>
              <TestTube className="h-4 w-4" />
              Test notification
            </Button>
            <p className="text-xs text-slate-500">
              Status: <strong>{permission}</strong>
              {permission === "default" && " — click Test or enable from dashboard banner."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-violet-600" />
              {user?.role === "PATIENT" ? "Phone Call Reminders" : "Emergency Contact Phone"}
            </CardTitle>
            <CardDescription>
              {user?.role === "PATIENT"
                ? "Receive a phone call if you miss a reminder"
                : "Configure the mobile number where you will receive emergency SOS voice calls"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {user?.role === "PATIENT" && (
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-medium text-slate-700">Enable phone call reminders</span>
                <input
                  id="pref-voice"
                  name="voiceEscalationEnabled"
                  type="checkbox"
                  checked={preferences.voiceEscalationEnabled}
                  disabled={saving}
                  onChange={(e) => handleToggle("voiceEscalationEnabled", e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-teal-600"
                />
              </label>
            )}
            <FormGroup>
              <Label htmlFor="pref-phone">Mobile number (E.164 or 10-digit IN)</Label>
              <Input
                id="pref-phone"
                name="phoneNumber"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                onBlur={handlePhoneBlur}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="pref-provider">Voice provider</Label>
              <Select
                id="pref-provider"
                name="voiceProvider"
                value={preferences.voiceProvider}
                onChange={(e) => handleToggle("voiceProvider", e.target.value)}
              >
                <option value="TWILIO">Twilio (global)</option>
                <option value="EXOTEL">Exotel (India)</option>
              </Select>
            </FormGroup>
            <Button type="button" variant="outline" size="sm" className="w-fit gap-2" onClick={handleTestVoice} disabled={saving}>
              <Phone className="h-4 w-4" />
              Test voice call
            </Button>
          </CardContent>
        </Card>

        {user?.role === "PATIENT" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Reminder Timing
                </CardTitle>
                <CardDescription>Customize when you receive follow-up reminders</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormGroup>
                  <Label htmlFor="pref-esc-delay">Follow-up reminder delay (minutes)</Label>
                  <Input
                    id="pref-esc-delay"
                    name="escalationDelayMinutes"
                    type="number"
                    min={1}
                    max={60}
                    value={preferences.escalationDelayMinutes}
                    onChange={(e) => handleToggle("escalationDelayMinutes", parseInt(e.target.value, 10) || 5)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="pref-voice-delay">Phone call delay (minutes after follow-up)</Label>
                  <Input
                    id="pref-voice-delay"
                    name="voiceEscalationDelayMinutes"
                    type="number"
                    min={1}
                    max={60}
                    value={preferences.voiceEscalationDelayMinutes}
                    onChange={(e) => handleToggle("voiceEscalationDelayMinutes", parseInt(e.target.value, 10) || 5)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="pref-reminder-freq">Reminder repeat interval (minutes)</Label>
                  <Input
                    id="pref-reminder-freq"
                    name="reminderFrequencyMinutes"
                    type="number"
                    min={1}
                    max={30}
                    value={preferences.reminderFrequencyMinutes}
                    onChange={(e) => handleToggle("reminderFrequencyMinutes", parseInt(e.target.value, 10) || 1)}
                  />
                </FormGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {preferences.silentMode ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-teal-600" />}
                  Silent mode
                </CardTitle>
                <CardDescription>Pause all reminders</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span className="text-sm font-medium text-slate-700">Enable silent mode</span>
                  <input
                    id="pref-silent"
                    name="silentMode"
                    type="checkbox"
                    checked={preferences.silentMode}
                    disabled={saving}
                    onChange={(e) => handleToggle("silentMode", e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-teal-600"
                  />
                </label>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
