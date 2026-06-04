import Link from 'next/link';
import { Pill, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Medicine } from '@/lib/types';

interface MedicineOverviewProps {
  medicines: Medicine[];
  readOnly?: boolean;
}

function formatTime(t: string) {
  try {
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  } catch {
    return t;
  }
}

export function MedicineOverview({ medicines, readOnly }: MedicineOverviewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Active medicines</CardTitle>
          <CardDescription>
            {readOnly ? 'Patient inventory overview' : `${medicines.length} tracked`}
          </CardDescription>
        </div>
        {!readOnly && (
          <Link href="/medicines" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {medicines.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No active medicines.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {medicines.slice(0, 5).map((med) => (
              <li key={med.id}>
                <Link
                  href={readOnly ? '#' : `/medicines/${med.id}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 transition-colors ${
                    readOnly ? 'pointer-events-none' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                      <Pill className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{med.medicineName}</p>
                      <p className="text-xs text-slate-500">
                        {med.dosage} · {med.schedules?.length ?? 0} reminders
                        {med.schedules?.[0] && ` · ${formatTime(med.schedules[0].reminderTime)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {med.refillWarning ? (
                      <Badge variant="warning">Low</Badge>
                    ) : (
                      <Badge variant="success">{med.stockCount}</Badge>
                    )}
                    {!readOnly && <ChevronRight className="h-4 w-4 text-slate-300" />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
