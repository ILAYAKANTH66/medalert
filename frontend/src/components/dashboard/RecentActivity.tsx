import { Check, CornerDownRight, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { DoseLog } from '@/lib/types';

interface RecentActivityProps {
  activities: DoseLog[];
}

function formatTime(timeStr: string) {
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function statusVariant(status: string) {
  switch (status) {
    case 'TAKEN':
      return 'success' as const;
    case 'SKIPPED':
      return 'warning' as const;
    default:
      return 'error' as const;
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'TAKEN') return <Check className="h-3.5 w-3.5" />;
  if (status === 'SKIPPED') return <CornerDownRight className="h-3.5 w-3.5" />;
  return <AlertCircle className="h-3.5 w-3.5" />;
}

function parseLocalDate(dateStr: string) {
  // Prevent YYYY-MM-DD from being parsed as UTC midnight which can shift to previous day
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-');
  if (y && m && d) {
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }
  return new Date(dateStr);
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest dose logs across your medicines</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No dose activity recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activities.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{log.medicineName}</p>
                  <p className="text-xs text-slate-500">
                    {parseLocalDate(log.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {formatTime(log.reminderTime)}
                    {log.takenTime && log.status === 'TAKEN' && ` · taken ${formatTime(log.takenTime)}`}
                  </p>
                </div>
                <Badge variant={statusVariant(log.status)} className="shrink-0 gap-1">
                  <StatusIcon status={log.status} />
                  {log.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
