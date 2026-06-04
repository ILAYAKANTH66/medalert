"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService } from "@/services/analytics.service";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card } from "@/components/ui/Card";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Flame,
  Calendar,
  Pill,
  BarChart3,
} from "lucide-react";
import type { AnalyticsData, DailyAdherence, MedicineStat } from "@/lib/types";

function AdherenceBadge({ value }: { value: number }) {
  if (value >= 90) return <span className="analytics-badge analytics-badge-green">Excellent</span>;
  if (value >= 70) return <span className="analytics-badge analytics-badge-blue">Good</span>;
  if (value >= 50) return <span className="analytics-badge analytics-badge-amber">Fair</span>;
  return <span className="analytics-badge analytics-badge-red">Poor</span>;
}

function AdherenceBar({ taken, skipped, missed }: { taken: number; skipped: number; missed: number }) {
  const total = taken + skipped + missed;
  if (total === 0) return <div className="analytics-bar-track"><div className="analytics-bar-empty" /></div>;
  const takenPct = (taken / total) * 100;
  const skippedPct = (skipped / total) * 100;
  const missedPct = (missed / total) * 100;
  return (
    <div className="analytics-bar-track">
      <div className="analytics-bar-taken" style={{ width: `${takenPct}%` }} title={`Taken: ${taken}`} />
      <div className="analytics-bar-skipped" style={{ width: `${skippedPct}%` }} title={`Skipped: ${skipped}`} />
      <div className="analytics-bar-missed" style={{ width: `${missedPct}%` }} title={`Missed: ${missed}`} />
    </div>
  );
}

function DailyChart({ data }: { data: DailyAdherence[] }) {
  if (!data.length) return null;
  const maxExpected = Math.max(...data.map((d) => d.expected), 1);

  // Use local date to avoid UTC-offset mismatch
  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="analytics-chart">
      <div className="analytics-chart-bars">
        {data.map((d) => {
          const height = d.expected === 0 ? 0 : (d.taken / maxExpected) * 100;
          const isToday = d.date === todayLocal;
          const tooltipText = d.expected === 0
            ? `${d.label}: No doses scheduled`
            : `${d.label}: ${d.taken}/${d.expected} doses (${d.adherencePercentage.toFixed(0)}%)`;
          return (
            <div key={d.date} className="analytics-chart-col" title={tooltipText}>
              <div className="analytics-chart-bar-wrap">
                <div
                  className={`analytics-chart-bar ${isToday ? "analytics-chart-bar-today" : ""}`}
                  style={{ height: `${Math.max(height, d.expected > 0 ? 3 : 0)}%` }}
                />
              </div>
              <span className="analytics-chart-label">{d.label.split(" ")[1] || d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="analytics-chart-legend">
        <span className="analytics-chart-legend-dot analytics-chart-legend-taken" />
        <span className="text-xs text-slate-500">Taken doses per day (hover for details)</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: "weekly" | "monthly") => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getAnalytics(p);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "PATIENT") { router.push("/dashboard"); return; }
    load(period);
  }, [user, authLoading, router, load, period]);

  const handlePeriodChange = (p: "weekly" | "monthly") => {
    setPeriod(p);
    load(p);
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Analytics" description="Your medication adherence insights">
        <LoadingSpinner label="Loading analytics..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Analytics"
      description="Your medication adherence insights"
    >
      <div className="analytics-page">
        {/* Period Selector */}
        <div className="analytics-header">
          <div>
            <h1 className="analytics-title">
              <BarChart3 className="h-5 w-5" />
              Adherence Analytics
            </h1>
            <p className="analytics-subtitle">
              {data ? `${data.startDate} → ${data.endDate}` : "Your medication performance"}
            </p>
          </div>
          <div className="analytics-period-toggle">
            <button
              id="analytics-period-weekly"
              className={`analytics-period-btn ${period === "weekly" ? "analytics-period-btn-active" : ""}`}
              onClick={() => handlePeriodChange("weekly")}
            >
              7 Days
            </button>
            <button
              id="analytics-period-monthly"
              className={`analytics-period-btn ${period === "monthly" ? "analytics-period-btn-active" : ""}`}
              onClick={() => handlePeriodChange("monthly")}
            >
              30 Days
            </button>
          </div>
        </div>

        {error && (
          <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </Card>
        )}

        {data && (
          <>
            {/* Summary Stats */}
            <div className="analytics-stats-grid">
              <Card className="analytics-stat-card analytics-stat-primary">
                <div className="analytics-stat-icon">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="analytics-stat-label">Overall Adherence</p>
                  <p className="analytics-stat-value">{data.overallAdherence.toFixed(1)}%</p>
                  <AdherenceBadge value={data.overallAdherence} />
                </div>
              </Card>

              <Card className="analytics-stat-card analytics-stat-green">
                <div className="analytics-stat-icon analytics-stat-icon-green">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="analytics-stat-label">Doses Taken</p>
                  <p className="analytics-stat-value analytics-stat-value-green">{data.totalTaken}</p>
                  <p className="analytics-stat-sub">of {data.totalExpected} expected</p>
                </div>
              </Card>

              <Card className="analytics-stat-card analytics-stat-amber">
                <div className="analytics-stat-icon analytics-stat-icon-amber">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="analytics-stat-label">Doses Missed</p>
                  <p className="analytics-stat-value analytics-stat-value-amber">{data.totalMissed}</p>
                  <p className="analytics-stat-sub">{data.totalSkipped} skipped</p>
                </div>
              </Card>

              <Card className="analytics-stat-card analytics-stat-orange">
                <div className="analytics-stat-icon analytics-stat-icon-orange">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="analytics-stat-label">Current Streak</p>
                  <p className="analytics-stat-value analytics-stat-value-orange">{data.currentStreak}</p>
                  <p className="analytics-stat-sub">consecutive days</p>
                </div>
              </Card>
            </div>

            {/* Best/Worst Day */}
            {(data.bestDay || data.worstDay) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.bestDay && (
                  <Card className="analytics-insight-card analytics-insight-green">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">Best Day</p>
                      <p className="text-sm text-emerald-700">{data.bestDay}</p>
                    </div>
                  </Card>
                )}
                {data.worstDay && data.worstDay !== data.bestDay && (
                  <Card className="analytics-insight-card analytics-insight-red">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                    <div>
                      <p className="text-xs font-semibold text-rose-800">Needs Improvement</p>
                      <p className="text-sm text-rose-700">{data.worstDay}</p>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Daily Chart */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Daily Dose Completion</h2>
              </div>
              {data.dailyAdherence.every((d) => d.expected === 0) ? (
                <div className="analytics-empty">
                  <AlertCircle className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">No dose data for this period yet</p>
                </div>
              ) : (
                <DailyChart data={data.dailyAdherence} />
              )}
            </Card>

            {/* Daily Breakdown Table */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Daily Breakdown</h2>
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Adherence</th>
                      <th>Taken</th>
                      <th>Skipped</th>
                      <th>Missed</th>
                      <th>Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyAdherence.map((d) => (
                      <tr key={d.date}>
                        <td className="analytics-table-date">{d.label}</td>
                        <td>
                          <span className={`analytics-pct ${
                            d.expected === 0 ? "analytics-pct-zero" :
                            d.adherencePercentage >= 90 ? "analytics-pct-green" :
                            d.adherencePercentage >= 70 ? "analytics-pct-blue" :
                            d.adherencePercentage >= 50 ? "analytics-pct-amber" : "analytics-pct-red"
                          }`}>
                            {d.expected === 0 ? "—" : `${d.adherencePercentage.toFixed(0)}%`}
                          </span>
                        </td>
                        <td className="analytics-table-taken">{d.taken}</td>
                        <td className="analytics-table-skipped">{d.skipped}</td>
                        <td className="analytics-table-missed">{d.missed}</td>
                        <td>
                          <AdherenceBar taken={d.taken} skipped={d.skipped} missed={d.missed} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Per Medicine Stats */}
            {data.medicineStats.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Pill className="h-4 w-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-900">Per Medicine Performance</h2>
                </div>
                <div className="analytics-medicine-grid">
                  {data.medicineStats.map((med: MedicineStat) => (
                    <div key={med.medicineId} className="analytics-medicine-card">
                      <div className="analytics-medicine-header">
                        <div className="analytics-medicine-icon">
                          <Pill className="h-4 w-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="analytics-medicine-name">{med.medicineName}</p>
                          <p className="analytics-medicine-dosage">{med.dosage}</p>
                        </div>
                        <AdherenceBadge value={med.adherencePercentage} />
                      </div>
                      <div className="analytics-medicine-pct">
                        <div className="analytics-medicine-pct-track">
                          <div
                            className="analytics-medicine-pct-fill"
                            style={{ width: `${Math.min(med.adherencePercentage, 100)}%` }}
                          />
                        </div>
                        <span className="analytics-medicine-pct-label">{med.adherencePercentage.toFixed(0)}%</span>
                      </div>
                      <div className="analytics-medicine-counts">
                        <span className="analytics-medicine-taken">✓ {med.taken}</span>
                        <span className="analytics-medicine-skipped">— {med.skipped}</span>
                        <span className="analytics-medicine-missed">✕ {med.missed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
