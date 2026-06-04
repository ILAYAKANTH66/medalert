import React from 'react';
import { Check, AlertCircle, Clock, ChevronRight, CornerDownRight } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface DoseTimelineItem {
  medicineId: number;
  medicineName: string;
  dosage: string;
  beforeFood: boolean;
  reminderTime: string;
  status: 'TAKEN' | 'SKIPPED' | 'MISSED' | 'UPCOMING';
  takenTime?: string;
}

interface TimelineProps {
  items: DoseTimelineItem[];
  activeMedicines: any[]; // Used to overlay refill warnings and stock details
  userRole: 'PATIENT' | 'CARETAKER';
  onAction?: (medicineId: number, reminderTime: string, status: 'TAKEN' | 'SKIPPED' | 'MISSED') => Promise<void>;
  loading?: boolean;
}

export const Timeline = ({ items = [], activeMedicines = [], userRole, onAction, loading = false }: TimelineProps) => {
  
  const formatTime = (timeStr: string | { hour?: number; minute?: number } | null | undefined) => {
    if (!timeStr) return '—';
    if (typeof timeStr === 'object') {
      const h = timeStr.hour ?? 0;
      const m = String(timeStr.minute ?? 0).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    }
    try {
      const normalized = String(timeStr).slice(0, 5);
      const [h, m] = normalized.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return {
          color: 'bg-emerald-500 text-white ring-emerald-100 dark:ring-emerald-950/40',
          icon: <Check className="h-3.5 w-3.5 stroke-[3]" />,
          badgeVariant: 'success' as const,
        };
      case 'SKIPPED':
        return {
          color: 'bg-amber-500 text-white ring-amber-100 dark:ring-amber-950/40',
          icon: <CornerDownRight className="h-3.5 w-3.5" />,
          badgeVariant: 'warning' as const,
        };
      case 'MISSED':
        return {
          color: 'bg-rose-500 text-white ring-rose-100 dark:ring-rose-950/40',
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          badgeVariant: 'error' as const,
        };
      default: // UPCOMING
        return {
          color: 'bg-teal-600 text-white ring-teal-100',
          icon: <Clock className="h-3.5 w-3.5" />,
          badgeVariant: 'info' as const,
        };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Today&apos;s Dosage Timeline</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Track and log your scheduled doses chronologically
          </p>
        </div>
        {userRole === 'CARETAKER' && (
          <Badge variant="secondary">Caretaker Read-Only Mode</Badge>
        )}
      </CardHeader>
      
      <CardContent>
        {items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <Clock className="h-8 w-8 text-zinc-300 stroke-[1.5]" />
            <span className="text-sm">No scheduled doses configured for today</span>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l border-zinc-100 dark:border-zinc-800/80 ml-3 sm:ml-4 py-2 flex flex-col gap-6">
            {items.map((item, index) => {
              const config = getStatusConfig(item.status);
              
              // Find matching medicine to retrieve supply/refill alerts
              const medicineInfo = activeMedicines.find(m => m.id === item.medicineId);
              const hasRefillWarning = medicineInfo?.refillWarning;

              return (
                <div key={index} className="relative group select-none timeline-item">
                  {/* Timeline circular indicator */}
                  <div className={`absolute -left-[38px] sm:-left-[46px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 transition-all duration-300 ${config.color}`}>
                    {config.icon}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-950/5 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-all duration-300">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {formatTime(item.reminderTime)}
                        </span>
                        <ChevronRight className="h-3 w-3 text-zinc-300" />
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {item.medicineName}
                        </span>
                        <Badge variant="secondary" className="font-bold">
                          {item.dosage}
                        </Badge>
                        <Badge variant={item.beforeFood ? 'active' : 'info'}>
                          {item.beforeFood ? 'Before Food' : 'After Food'}
                        </Badge>
                      </div>

                      {/* Dynamic history taken summary */}
                      {item.status === 'TAKEN' && item.takenTime && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Taken at {formatTime(item.takenTime)}
                        </span>
                      )}
                      
                      {item.status === 'SKIPPED' && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Dose skipped
                        </span>
                      )}

                      {item.status === 'MISSED' && (
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          Dose missed (past time)
                        </span>
                      )}

                      {/* Supply depletion alert inline */}
                      {hasRefillWarning && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-400 font-semibold select-none animate-pulse">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Low Supply Alert: Only {medicineInfo.stockCount} doses left. Predicted refill needed by {medicineInfo.refillPredictionDate ? new Date(medicineInfo.refillPredictionDate).toLocaleDateString() : 'soon'}.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Action Buttons */}
                    {userRole === 'PATIENT' && onAction && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {item.status !== 'TAKEN' ? (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => onAction(item.medicineId, item.reminderTime, 'TAKEN')}
                              disabled={loading}
                            >
                              Take Dose
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAction(item.medicineId, item.reminderTime, 'SKIPPED')}
                              disabled={loading}
                            >
                              Skip
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/30"
                            onClick={() => onAction(item.medicineId, item.reminderTime, 'SKIPPED')}
                            disabled={loading}
                          >
                            Undo / Skip
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
