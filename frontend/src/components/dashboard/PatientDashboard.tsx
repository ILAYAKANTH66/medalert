"use client";

import Link from "next/link";
import { CheckCircle, Clock, Activity, AlertTriangle, Pill, ArrowRight } from "lucide-react";
import { StatWidget } from '@/components/ui/StatWidget';
import { Chart } from '@/components/ui/Chart';
import { Timeline } from '@/components/ui/Timeline';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';
import { RefillAlerts } from './RefillAlerts';
import { MedicineOverview } from './MedicineOverview';
import { NotificationBanner } from './NotificationBanner';
import { EmergencyButton } from './EmergencyButton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import type { DashboardSummary } from '@/lib/types';

interface PatientDashboardProps {
  data: DashboardSummary;
  loadingAction: boolean;
  showNotificationPrompt: boolean;
  onEnableNotifications: () => void;
  highlightedMedicineId?: number | null;
  onLogDose: (
    medicineId: number,
    reminderTime: string,
    status: 'TAKEN' | 'SKIPPED' | 'MISSED'
  ) => Promise<void>;
}

export function PatientDashboard({
  data,
  loadingAction,
  showNotificationPrompt,
  onEnableNotifications,
  onLogDose,
  highlightedMedicineId,
}: PatientDashboardProps) {
  const timeline = data.todayTimeline ?? [];
  const activeMedicines = data.activeMedicines ?? [];
  const weeklyAdherence = data.weeklyAdherence ?? [];
  const recentActivity = data.recentActivity ?? [];
  const refillUrgent = activeMedicines.filter((m) => m.refillWarning);
  const missedToday = timeline.filter((t) => t.status === 'MISSED').length;

  return (
    <div className="flex flex-col gap-5">
      {showNotificationPrompt && (
        <NotificationBanner onEnable={onEnableNotifications} />
      )}

      {/* Emergency SOS + Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track your medication adherence</p>
        </div>
        <EmergencyButton />
      </div>

      {(refillUrgent.length > 0 || missedToday > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {refillUrgent.length > 0 && (
            <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">{refillUrgent.length} refill alert{refillUrgent.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-amber-700/90 mt-0.5">Low stock — review medicines soon.</p>
                </div>
              </div>
            </Card>
          )}
          {missedToday > 0 && (
            <Card className="border-rose-200/80 bg-gradient-to-r from-rose-50/90 to-white p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-900">{missedToday} missed dose{missedToday > 1 ? 's' : ''} today</p>
                  <p className="text-xs text-rose-700/90 mt-0.5">Log doses on your timeline below.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatWidget
          title="Taken today"
          value={data.todayMedicinesTaken}
          icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
          description="Logged doses"
        />
        <StatWidget
          title="Upcoming"
          value={data.upcomingDoses}
          icon={<Clock className="h-4 w-4 text-teal-600" />}
          description="Scheduled left"
        />
        <StatWidget
          title="Adherence"
          value={`${Math.round(data.adherencePercentage)}%`}
          icon={<Activity className="h-4 w-4 text-sky-600" />}
          description="7-day rate"
          progress={data.adherencePercentage}
          progressColor="bg-teal-500"
        />
        <Card className="flex flex-col justify-center p-4 border-teal-100 bg-teal-50/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Active meds</p>
          <p className="text-2xl font-bold text-teal-900 mt-1">{activeMedicines.length}</p>
          <Link href="/medicines" className="mt-2">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-teal-700 px-0 hover:bg-transparent">
              Manage <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Timeline
            items={timeline}
            activeMedicines={activeMedicines}
            userRole="PATIENT"
            onAction={onLogDose}
            loading={loadingAction}
          />
        </div>
        <div className="xl:col-span-4 flex flex-col gap-5">
          <Chart
            data={weeklyAdherence}
            title="Weekly adherence"
            description="Completion by day"
          />
          <QuickActions
            showNotificationPrompt={showNotificationPrompt}
            onEnableNotifications={onEnableNotifications}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <RefillAlerts medicines={activeMedicines} />
        <MedicineOverview medicines={activeMedicines} />
        <RecentActivity activities={recentActivity} />
      </section>

      {activeMedicines.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Today&apos;s medicines</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeMedicines.slice(0, 6).map((med) => (
              <Link
                key={med.id}
                href={`/medicines/${med.id}`}
                id={`medicine-card-${med.id}`}
              >
                <Card
                  className={[
                    'p-4 hover:border-teal-200 hover:shadow-md transition-all duration-200 group h-full',
                    highlightedMedicineId === med.id
                      ? 'ring-2 ring-teal-400 ring-offset-2 shadow-lg shadow-teal-100 animate-pulse'
                      : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 group-hover:bg-teal-100 transition-colors">
                      <Pill className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{med.medicineName}</p>
                      <p className="text-xs text-slate-500">{med.dosage}</p>
                      {med.refillWarning && (
                        <span className="inline-flex mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Refill soon
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
