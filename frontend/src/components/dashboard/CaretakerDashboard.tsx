"use client";

import { UserPlus, UserCheck, Eye, CheckCircle, Clock, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { FormGroup, Label, Input, FormError } from '@/components/ui/Form';
import { StatWidget } from '@/components/ui/StatWidget';
import { Chart } from '@/components/ui/Chart';
import { Timeline } from '@/components/ui/Timeline';
import { RefillAlerts } from './RefillAlerts';
import { MedicineOverview } from './MedicineOverview';
import { RecentActivity } from './RecentActivity';
import type { DashboardSummary, UserProfile } from '@/lib/types';

interface CaretakerDashboardProps {
  patients: UserProfile[];
  patientDashboard: DashboardSummary | null;
  selectedPatientId: number | null;
  loadingPatient: boolean;
  linkError: string | null;
  linkSuccess: string | null;
  patientToken: string;
  onTokenChange: (v: string) => void;
  onLinkPatient: (e: React.FormEvent) => void;
  onSelectPatient: (id: number) => void;
}

export function CaretakerDashboard({
  patients,
  patientDashboard,
  selectedPatientId,
  loadingPatient,
  linkError,
  linkSuccess,
  patientToken,
  onTokenChange,
  onLinkPatient,
  onSelectPatient,
}: CaretakerDashboardProps) {
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-teal-600" />
              Link patient
            </CardTitle>
            <CardDescription>Enter the patient&apos;s caretaker token</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={onLinkPatient}>
              <FormGroup>
                <Label htmlFor="link-patient-token" required>Patient token</Label>
                <Input
                  id="link-patient-token"
                  name="patientToken"
                  type="text"
                  placeholder="e.g. MEDA3B2A4"
                  value={patientToken}
                  onChange={(e) => onTokenChange(e.target.value)}
                  required
                />
              </FormGroup>
              {linkError && <FormError>{linkError}</FormError>}
              {linkSuccess && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {linkSuccess}
                </p>
              )}
              <Button type="submit" className="w-full">
                Link patient
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My patients ({patients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {patients.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No linked patients yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {patients.map((pat) => (
                  <li key={pat.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPatient(pat.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedPatientId === pat.id
                          ? 'border-teal-200 bg-teal-50 text-teal-800'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{pat.name}</p>
                        <p className="text-xs text-slate-500">{pat.email}</p>
                      </div>
                      <Eye className="h-4 w-4 shrink-0 opacity-60" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-8">
        {!selectedPatientId ? (
          <Card className="flex min-h-[320px] flex-col items-center justify-center border-dashed text-slate-400">
            <UserCheck className="mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium">Select a patient to view their dashboard</p>
          </Card>
        ) : loadingPatient || !patientDashboard ? (
          <Card className="flex min-h-[320px] items-center justify-center">
            <Activity className="h-8 w-8 animate-spin text-teal-600" />
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Monitoring: {selectedPatient?.name}
              </h2>
              <Badge variant="secondary">Read-only</Badge>
            </div>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatWidget
                title="Taken today"
                value={patientDashboard.todayMedicinesTaken}
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
              />
              <StatWidget
                title="Upcoming"
                value={patientDashboard.upcomingDoses}
                icon={<Clock className="h-5 w-5 text-teal-600" />}
              />
              <StatWidget
                title="Adherence"
                value={`${patientDashboard.adherencePercentage}%`}
                icon={<Activity className="h-5 w-5 text-sky-600" />}
              />
            </section>

            <Chart
              data={patientDashboard.weeklyAdherence}
              title="Patient adherence"
              description="7-day completion overview"
            />

            <Timeline
              items={patientDashboard.todayTimeline}
              activeMedicines={patientDashboard.activeMedicines}
              userRole="CARETAKER"
            />

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <RefillAlerts medicines={patientDashboard.activeMedicines} readOnly />
              <MedicineOverview medicines={patientDashboard.activeMedicines} readOnly />
              <RecentActivity activities={patientDashboard.recentActivity} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

