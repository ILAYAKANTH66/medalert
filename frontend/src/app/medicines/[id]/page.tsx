"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMedicine } from "@/hooks/useMedicine";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { FormGroup, Label, Input, Select, FormError } from "@/components/ui/Form";
import { 
  Pill, Clock, ArrowLeft, Trash2, Edit3, Check, X, AlertTriangle, 
  Activity, Calendar, PackageCheck, ChevronRight, CornerDownRight 
} from "lucide-react";

const DoseStatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, any> = {
    TAKEN: "success", SKIPPED: "warning", MISSED: "error", UPCOMING: "info"
  };
  return <Badge variant={variants[status] ?? "default"}>{status}</Badge>;
};

export default function MedicineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const { user, loading: authLoading } = useAuth();
  const { fetchMedicine, fetchMedicineLogs, updateMedicine, deleteMedicine, loading, error } = useMedicine();

  const [med, setMed] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<any>(null);

  const medicineId = params.id as string;

  const loadData = useCallback(async () => {
    setPageLoading(true);
    try {
      const [medicineData, logsData] = await Promise.all([
        fetchMedicine(medicineId),
        fetchMedicineLogs(medicineId),
      ]);
      setMed(medicineData);
      setLogs(logsData);
      // Seed edit form from fetched data
      setEditData({
        medicineName: medicineData.medicineName,
        dosage: medicineData.dosage,
        stockCount: String(medicineData.stockCount ?? ""),
        beforeFood: medicineData.beforeFood,
        dailyFrequency: String(medicineData.dailyFrequency ?? "1"),
        startDate: medicineData.startDate ?? "",
        endDate: medicineData.endDate ?? "",
        reminderTimes: medicineData.schedules?.map((s: any) => s.reminderTime.substring(0, 5)) ?? ["08:00"],
      });
    } catch (err) {
      console.error("Failed to load medicine details:", err);
    } finally {
      setPageLoading(false);
    }
  }, [medicineId, fetchMedicine, fetchMedicineLogs]);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  const handleDelete = async () => {
    try {
      await deleteMedicine(medicineId);
      router.push("/medicines");
    } catch (err: any) {
      alert(err.message || "Failed to delete medicine.");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const updated = await updateMedicine(medicineId, {
        ...editData,
        stockCount: parseInt(editData.stockCount),
        dailyFrequency: parseInt(editData.dailyFrequency),
      });
      setMed(updated);
      router.replace(`/medicines/${medicineId}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to update medicine.");
    } finally {
      setSaving(false);
    }
  };

  const addReminderTime = () => {
    setEditData((prev: any) => ({ ...prev, reminderTimes: [...prev.reminderTimes, "12:00"] }));
  };
  const removeReminderTime = (idx: number) => {
    setEditData((prev: any) => ({
      ...prev,
      reminderTimes: prev.reminderTimes.filter((_: any, i: number) => i !== idx),
    }));
  };
  const updateReminderTime = (idx: number, val: string) => {
    setEditData((prev: any) => {
      const updated = [...prev.reminderTimes];
      updated[idx] = val;
      return { ...prev, reminderTimes: updated };
    });
  };

  const formatTime = (t: string) => {
    try {
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    } catch { return t; }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Activity className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!med) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-zinc-950">
        <Pill className="h-10 w-10 text-zinc-300" strokeWidth={1.5} />
        <p className="text-zinc-500 font-medium">Medicine not found.</p>
        <Link href="/medicines"><Button variant="outline">Back to Medicines</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/medicines">
            <Button variant="ghost" size="sm" className="gap-2 text-zinc-600">
              <ArrowLeft className="h-4 w-4" />
              Medicines
            </Button>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
            {med.medicineName}
          </h1>
        </div>
        {user?.role === "PATIENT" && !isEditMode && (
          <div className="flex items-center gap-2">
            <Link href={`/medicines/${medicineId}?edit=true`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
            {deleteConfirm ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-rose-600">Confirm delete?</span>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>Yes</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)}>No</Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-2"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isEditMode && user?.role === "PATIENT" && editData ? (
          /* ── EDIT FORM ─────────────────────────────────────── */
          <Card>
            <CardHeader>
              <CardTitle>Edit Medicine: {med.medicineName}</CardTitle>
              <CardDescription>Update details and reminder schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormGroup>
                    <Label htmlFor="edit-medicine-name" required>Medicine Name</Label>
                    <Input id="edit-medicine-name" name="medicineName" value={editData.medicineName} onChange={e => setEditData((p: any) => ({ ...p, medicineName: e.target.value }))} required />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="edit-medicine-dosage" required>Dosage</Label>
                    <Input id="edit-medicine-dosage" name="dosage" value={editData.dosage} onChange={e => setEditData((p: any) => ({ ...p, dosage: e.target.value }))} required placeholder="e.g. 500mg, 1 tablet" />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="edit-medicine-stock" required>Stock Count</Label>
                    <Input id="edit-medicine-stock" name="stockCount" type="number" min="0" value={editData.stockCount} onChange={e => setEditData((p: any) => ({ ...p, stockCount: e.target.value }))} required />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="edit-medicine-food" required>Food Timing</Label>
                    <Select id="edit-medicine-food" name="beforeFood" value={editData.beforeFood ? "true" : "false"} onChange={e => setEditData((p: any) => ({ ...p, beforeFood: e.target.value === "true" }))}>
                      <option value="false">After Food</option>
                      <option value="true">Before Food</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="edit-medicine-start">Start Date</Label>
                    <Input id="edit-medicine-start" name="startDate" type="date" value={editData.startDate} onChange={e => setEditData((p: any) => ({ ...p, startDate: e.target.value }))} />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="edit-medicine-end">End Date</Label>
                    <Input id="edit-medicine-end" name="endDate" type="date" value={editData.endDate} onChange={e => setEditData((p: any) => ({ ...p, endDate: e.target.value }))} />
                  </FormGroup>
                </div>

                {/* Reminder Times */}
                <div className="flex flex-col gap-3">
                  <Label>Reminder Times</Label>
                  <div className="flex flex-col gap-2">
                    {editData.reminderTimes.map((time: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Input id={`edit-reminder-${idx}`} name={`reminderTime-${idx}`} type="time" value={time} onChange={e => updateReminderTime(idx, e.target.value)} className="w-40" required />
                        {editData.reminderTimes.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-700" onClick={() => removeReminderTime(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="w-fit text-indigo-600 font-bold gap-1" onClick={addReminderTime}>
                      + Add Another Time
                    </Button>
                  </div>
                </div>

                {formError && <FormError>{formError}</FormError>}

                <div className="flex gap-3 pt-2">
                  <Button type="submit" variant="default" className="py-5 px-6 rounded-xl font-bold" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Link href={`/medicines/${medicineId}`}>
                    <Button type="button" variant="outline" className="py-5 px-6 rounded-xl">Cancel</Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* ── DETAIL VIEW ────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left column: Medicine info */}
            <div className="md:col-span-2 flex flex-col gap-5">
              <Card className={med.refillWarning ? "border-amber-300/60 dark:border-amber-900/40 bg-amber-50/20" : ""}>
                <CardContent className="p-6 flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl">
                      <Pill className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{med.medicineName}</h2>
                      <p className="text-sm text-zinc-500">{med.dosage}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">Stock</span>
                      <span className={`font-bold ${med.refillWarning ? "text-amber-600" : "text-zinc-800 dark:text-zinc-200"}`}>
                        {med.stockCount} doses left
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${med.refillWarning ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, (med.stockCount / Math.max(med.stockCount * 1.5, 30)) * 100)}%` }}
                      />
                    </div>
                    {med.daysRemaining !== null && (
                      <p className="text-xs text-zinc-400 font-semibold">
                        ~{med.daysRemaining} days remaining
                        {med.refillPredictionDate && ` · Refill by ${new Date(med.refillPredictionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </p>
                    )}
                  </div>

                  {med.refillWarning && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Low stock — please refill soon</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Food Timing</span>
                      <Badge variant={med.beforeFood ? "active" : "info"}>{med.beforeFood ? "Before Food" : "After Food"}</Badge>
                    </div>
                    {med.startDate && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Start Date</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{new Date(med.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {med.endDate && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">End Date</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{new Date(med.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Daily Schedule</span>
                    <div className="flex flex-wrap gap-2">
                      {med.schedules?.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-lg px-3 py-1.5 text-sm font-bold">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(s.reminderTime)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Dose log history */}
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Dose History</CardTitle>
                  <CardDescription>All logged doses for {med.medicineName}</CardDescription>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                      <Calendar className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                      <p className="text-sm">No doses logged yet. Start tracking from the dashboard timeline.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {logs.map((log: any) => (
                        <div key={log.id} className="py-3.5 flex items-center justify-between gap-3">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              </span>
                              <ChevronRight className="h-3 w-3 text-zinc-300" />
                              <span className="font-semibold text-zinc-500">
                                {formatTime(log.reminderTime)}
                              </span>
                            </div>
                            {log.status === "TAKEN" && log.takenTime && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                Taken at {formatTime(log.takenTime)}
                              </span>
                            )}
                          </div>
                          <DoseStatusBadge status={log.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
