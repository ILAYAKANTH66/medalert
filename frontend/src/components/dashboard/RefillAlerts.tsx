import Link from 'next/link';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Medicine } from '@/lib/types';

interface RefillAlertsProps {
  medicines: Medicine[];
  readOnly?: boolean;
}

export function RefillAlerts({ medicines, readOnly }: RefillAlertsProps) {
  const warnings = medicines.filter((m) => m.refillWarning);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refill alerts</CardTitle>
        <CardDescription>Low stock and predicted depletion</CardDescription>
      </CardHeader>
      <CardContent>
        {warnings.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            All supplies at healthy levels
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {warnings.map((med) => {
              const content = (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{med.medicineName}</p>
                      <p className="text-xs text-slate-500">
                        ~{med.daysRemaining ?? 'few'} days remaining
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning" className="shrink-0">
                    {med.stockCount} left
                  </Badge>
                </>
              );

              return (
                <li key={med.id}>
                  {readOnly ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-amber-50/40 px-4 py-3">
                      {content}
                    </div>
                  ) : (
                    <Link
                      href={`/medicines/${med.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-amber-50/40 px-4 py-3 transition-colors hover:bg-amber-50"
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
