"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMedicine } from "@/hooks/useMedicine";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { FormGroup, Label, Input, Select, FormError } from "@/components/ui/Form";
import { ArrowLeft, Pill, Plus, X, Clock, Save } from "lucide-react";

export default function AddMedicinePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createMedicine, loading, error } = useMedicine();

  const [formData, setFormData] = useState({
    medicineName: "",
    dosage: "",
    stockCount: "",
    beforeFood: "false",
    dailyFrequency: "1",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    reminderTimes: ["08:00"],
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect caretakers — they cannot add medicines
  if (!authLoading && user?.role === "CARETAKER") {
    router.push("/dashboard");
    return null;
  }

  const addReminderTime = () => {
    setFormData((p) => ({ ...p, reminderTimes: [...p.reminderTimes, "12:00"] }));
  };

  const removeReminderTime = (idx: number) => {
    setFormData((p) => ({
      ...p,
      reminderTimes: p.reminderTimes.filter((_, i) => i !== idx),
    }));
  };

  const updateReminderTime = (idx: number, val: string) => {
    setFormData((p) => {
      const updated = [...p.reminderTimes];
      updated[idx] = val;
      return { ...p, reminderTimes: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.reminderTimes.length === 0) {
      setFormError("At least one reminder time is required.");
      return;
    }

    try {
      await createMedicine({
        medicineName: formData.medicineName,
        dosage: formData.dosage,
        stockCount: parseInt(formData.stockCount),
        beforeFood: formData.beforeFood === "true",
        dailyFrequency: parseInt(formData.dailyFrequency),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        reminderTimes: formData.reminderTimes,
      });
      router.push("/medicines");
    } catch (err: any) {
      setFormError(err.message || "Failed to add medicine. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/80 px-6 py-4 flex items-center gap-3">
        <Link href="/medicines">
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-600 dark:text-zinc-400">
            <ArrowLeft className="h-4 w-4" />
            <span>Medicines</span>
          </Button>
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-indigo-600" />
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Add New Medicine</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Medicine Details</CardTitle>
            <CardDescription>
              Fill in the details below. Stock will automatically decrement when doses are marked as taken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              {/* Section: Basic Info */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Basic Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <FormGroup>
                    <Label htmlFor="medicine-name" required>Medicine Name</Label>
                    <Input
                      id="medicine-name"
                      name="medicineName"
                      type="text"
                      placeholder="e.g. Metformin, Aspirin"
                      value={formData.medicineName}
                      onChange={(e) => setFormData((p) => ({ ...p, medicineName: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="medicine-dosage" required>Dosage</Label>
                    <Input
                      id="medicine-dosage"
                      name="dosage"
                      type="text"
                      placeholder="e.g. 500mg, 1 tablet"
                      value={formData.dosage}
                      onChange={(e) => setFormData((p) => ({ ...p, dosage: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </FormGroup>
                </div>
              </div>

              {/* Section: Stock & Timing */}
              <div className="flex flex-col gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Stock & Timing</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <FormGroup>
                    <Label htmlFor="medicine-stock" required>Initial Stock Count</Label>
                    <Input
                      id="medicine-stock"
                      name="stockCount"
                      type="number"
                      min="0"
                      placeholder="e.g. 30"
                      value={formData.stockCount}
                      onChange={(e) => setFormData((p) => ({ ...p, stockCount: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="medicine-food-timing" required>Food Timing</Label>
                    <Select
                      id="medicine-food-timing"
                      name="beforeFood"
                      value={formData.beforeFood}
                      onChange={(e) => setFormData((p) => ({ ...p, beforeFood: e.target.value }))}
                      disabled={loading}
                    >
                      <option value="false">After Food</option>
                      <option value="true">Before Food</option>
                    </Select>
                  </FormGroup>
                </div>
              </div>

              {/* Section: Course Duration */}
              <div className="flex flex-col gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Course Duration</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <FormGroup>
                    <Label htmlFor="medicine-start-date" required>Start Date</Label>
                    <Input
                      id="medicine-start-date"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                      required
                      disabled={loading}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="medicine-end-date">End Date <span className="text-zinc-400 font-normal">(optional)</span></Label>
                    <Input
                      id="medicine-end-date"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                      disabled={loading}
                    />
                  </FormGroup>
                </div>
              </div>

              {/* Section: Reminder Schedule */}
              <div className="flex flex-col gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Daily Reminder Times</span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {formData.reminderTimes.length} time{formData.reminderTimes.length !== 1 ? "s" : ""} per day
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {formData.reminderTimes.map((time, idx) => (
                    <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2 flex-1 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-3 py-2">
                        <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                        <input
                          id={`reminder-time-${idx}`}
                          name={`reminderTime-${idx}`}
                          type="time"
                          value={time}
                          onChange={(e) => updateReminderTime(idx, e.target.value)}
                          className="flex-1 bg-transparent text-sm font-semibold text-zinc-800 dark:text-zinc-200 outline-none"
                          required
                          disabled={loading}
                        />
                      </div>
                      {formData.reminderTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReminderTime(idx)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
                          aria-label="Remove time"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-2 text-indigo-600 dark:text-indigo-400 font-bold"
                    onClick={addReminderTime}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Time
                  </Button>
                </div>

                <p className="text-xs text-zinc-400 font-medium">
                  Background reminders will be sent at each scheduled time via browser notifications.
                </p>
              </div>

              {/* Error display */}
              {(formError || error) && (
                <FormError>{formError || error}</FormError>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1 py-5 rounded-xl font-bold shadow-md shadow-indigo-600/10 gap-2"
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Saving Medicine..." : "Save Medicine"}
                </Button>
                <Link href="/medicines">
                  <Button
                    type="button"
                    variant="outline"
                    className="py-5 px-5 rounded-xl font-bold"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Link>
              </div>

            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

