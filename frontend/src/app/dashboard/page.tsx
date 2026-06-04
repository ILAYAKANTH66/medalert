"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMedicine } from "@/hooks/useMedicine";
import { useCaretaker } from "@/hooks/useCaretaker";
import { useNotifications } from "@/hooks/useNotifications";
import { dashboardService } from "@/services/dashboard.service";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";
import { CaretakerDashboard } from "@/components/dashboard/CaretakerDashboard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { DashboardSummary } from "@/lib/types";
import { ApiError } from "@/lib/api";

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { permission, requestPermission, syncSchedules } = useNotifications();
  const { logDose } = useMedicine();

  const searchParams = useSearchParams();

  const [patientData, setPatientData] = useState<DashboardSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [highlightedMedicineId, setHighlightedMedicineId] = useState<number | null>(null);
  const lastHandledDeepLink = useRef<string | null>(null);

  const loadPatientDashboard = useCallback(async () => {
    setLoadingData(true);
    setLoadError(null);
    try {
      const summary = await dashboardService.getDashboardSummary();
      setPatientData(summary);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to load dashboard";
      setLoadError(message);
      setPatientData(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role === "PATIENT") {
      loadPatientDashboard();
    }
  }, [user, authLoading, loadPatientDashboard, router]);

  // Deep-link: ?medicineId=X&action=TAKEN|SKIPPED — from SW notification click
  useEffect(() => {
    if (!searchParams || user?.role !== "PATIENT") return;
    const medIdStr = searchParams.get("medicineId");
    const action = searchParams.get("action") as "TAKEN" | "SKIPPED" | null;
    if (!medIdStr) return;

    const time = searchParams.get("time") || "";
    const date = searchParams.get("date") || "";
    const key = `${medIdStr}-${action}-${time}-${date}`;

    if (lastHandledDeepLink.current === key) return;
    lastHandledDeepLink.current = key;

    const medicineId = Number(medIdStr);
    setHighlightedMedicineId(medicineId);

    // Scroll to the highlighted element after a short settle time
    setTimeout(() => {
      const el = document.getElementById(`medicine-card-${medicineId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);

    // Auto-log if the action was passed (SW opened a new window)
    if (action === "TAKEN" || action === "SKIPPED") {
      const reminderTime = time || new Date().toLocaleTimeString("en-US", { hour12: false }).substring(0, 5);
      const reminderDate = date || new Date().toISOString().split("T")[0];
      handleLogDoseAction(medicineId, reminderTime, action, reminderDate);
    }

    // Dismiss highlight after 4 s
    const t = setTimeout(() => setHighlightedMedicineId(null), 4000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  const handleLogDoseAction = async (
    medicineId: number,
    reminderTime: string,
    status: "TAKEN" | "SKIPPED" | "MISSED",
    reminderDate?: string
  ) => {
    setLoadingAction(true);
    try {
      const todayStr = reminderDate || new Date().toISOString().split("T")[0];
      const nowTimeStr = new Date().toLocaleTimeString("en-US", { hour12: false }).substring(0, 5);

      await logDose({
        medicineId,
        date: todayStr,
        reminderTime,
        status,
        takenTime: status === "TAKEN" ? nowTimeStr : undefined,
      });

      await loadPatientDashboard();
      await syncSchedules();

      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "DOSE_ACTIONED",
          medicineId,
          reminderTime,
          date: todayStr,
        });
      }
    } catch (err) {
      console.error("Dose log failed:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  if (authLoading) {
    return <LoadingSpinner fullScreen label="Loading your profile..." />;
  }

  return (
    <AppLayout
      title="Dashboard"
      description={
        user?.role === "PATIENT"
          ? "Your adherence overview and dose timeline"
          : "Monitor linked patients"
      }
    >
      {user?.role === "PATIENT" ? (
        loadingData ? (
          <LoadingSpinner label="Loading dashboard..." />
        ) : loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        ) : patientData ? (
          <ErrorBoundary>
            <PatientDashboard
              data={{
                ...patientData,
                todayTimeline: patientData.todayTimeline ?? [],
                weeklyAdherence: patientData.weeklyAdherence ?? [],
                recentActivity: patientData.recentActivity ?? [],
                activeMedicines: patientData.activeMedicines ?? [],
              }}
              loadingAction={loadingAction}
              showNotificationPrompt={permission === "default"}
              onEnableNotifications={requestPermission}
              onLogDose={handleLogDoseAction}
              highlightedMedicineId={highlightedMedicineId}
            />
          </ErrorBoundary>
        ) : null
      ) : user?.role === "CARETAKER" ? (
        <ErrorBoundary>
          <CaretakerDashboardWrapper />
        </ErrorBoundary>
      ) : null}
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen label="Loading your profile..." />}>
      <DashboardContent />
    </Suspense>
  );
}

function CaretakerDashboardWrapper() {
  const {
    patients,
    patientDashboard,
    linkPatient,
    fetchPatients,
    fetchPatientDashboard,
  } = useCaretaker();

  const [loadingData, setLoadingData] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientTokenToLink, setPatientTokenToLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients().finally(() => setLoadingData(false));
  }, [fetchPatients]);

  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinkSuccess(null);
    if (!patientTokenToLink.trim()) return;
    try {
      const linked = await linkPatient(patientTokenToLink.trim());
      setLinkSuccess(`Patient ${linked.name} linked successfully.`);
      setPatientTokenToLink("");
      fetchPatients();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to link patient.");
    }
  };

  const handleSelectPatient = async (patientId: number) => {
    setSelectedPatientId(patientId);
    setLoadingData(true);
    try {
      await fetchPatientDashboard(patientId);
    } catch (err) {
      console.error("Failed to load patient dashboard:", err);
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <CaretakerDashboard
      patients={patients}
      patientDashboard={patientDashboard}
      selectedPatientId={selectedPatientId}
      loadingPatient={loadingData}
      linkError={linkError}
      linkSuccess={linkSuccess}
      patientToken={patientTokenToLink}
      onTokenChange={setPatientTokenToLink}
      onLinkPatient={handleLinkPatient}
      onSelectPatient={handleSelectPatient}
    />
  );
}
