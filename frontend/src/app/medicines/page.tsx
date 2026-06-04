"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMedicine } from "@/hooks/useMedicine";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import {
  Pill, Plus, Clock, AlertTriangle,
  PackageCheck, ChevronRight,
} from "lucide-react";

export default function MedicinesPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { medicines, loading, error, fetchMedicines } = useMedicine();
  const router = useRouter();

  const load = useCallback(async () => {
    if (!authLoading && isAuthenticated && user?.role === "PATIENT") {
      await fetchMedicines();
    }
  }, [authLoading, isAuthenticated, user, fetchMedicines]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user?.role === "CARETAKER") {
      router.push("/dashboard");
      return;
    }
    load();
  }, [authLoading, user, load, router]);

  const formatTime = (t: string) => {
    try {
      const [h, m] = t.split(":");
      const hour = parseInt(h, 10);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    } catch {
      return t;
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner fullScreen label="Loading medicines..." />;
  }

  return (
    <AppLayout
      title="Medicines"
      description="Manage your prescriptions and schedules"
      actions={
        <Link href="/medicines/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add medicine</span>
          </Button>
        </Link>
      }
    >
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {medicines.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Pill className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-slate-700">No medicines yet</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Add your first medicine to start tracking doses, stock, and adherence.
          </p>
          <Link href="/medicines/new" className="mt-6">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add first medicine
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {medicines.map((med) => (
            <Card
              key={med.id}
              className={
                med.refillWarning
                  ? "border-amber-200/80 bg-amber-50/20"
                  : ""
              }
            >
              {med.refillWarning && (
                <div className="h-1 bg-amber-400" />
              )}
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                      <Pill className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 truncate">
                        {med.medicineName}
                      </h3>
                      <p className="text-sm text-slate-500">{med.dosage}</p>
                    </div>
                  </div>
                  <Badge variant={med.refillWarning ? "warning" : "success"}>
                    {med.refillWarning ? (
                      <>
                        <AlertTriangle className="h-3 w-3" /> Refill soon
                      </>
                    ) : (
                      <>
                        <PackageCheck className="h-3 w-3" /> In stock
                      </>
                    )}
                  </Badge>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500">
                    <span>Stock</span>
                    <span className={med.refillWarning ? "text-amber-600" : ""}>
                      {med.stockCount} doses
                      {med.daysRemaining != null && ` · ~${med.daysRemaining} days`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        med.refillWarning ? "bg-amber-500" : "bg-teal-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (med.stockCount / Math.max(med.stockCount + 10, 30)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {med.schedules?.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      <Clock className="h-3 w-3 text-teal-600" />
                      {formatTime(s.reminderTime)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  <Badge variant={med.beforeFood ? "active" : "info"}>
                    {med.beforeFood ? "Before food" : "After food"}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Link href={`/medicines/${med.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      View details
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/medicines/${med.id}?edit=true`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

