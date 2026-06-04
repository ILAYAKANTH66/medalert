import React from 'react';
import { Card } from './Card';

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  progress?: number; // 0 to 100
  progressColor?: string; // Tailwind class
  alert?: boolean;
}

export const StatWidget = ({
  title,
  value,
  icon,
  description,
  progress,
  progressColor = 'bg-indigo-500',
  alert = false,
}: StatWidgetProps) => {
  return (
    <Card className={`overflow-hidden relative transition-all duration-300 ${alert ? 'border-amber-500/30 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/5' : ''}`}>
      {/* Background radial accent glow */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-teal-500/5 blur-xl pointer-events-none" />

      <div className="p-6 flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {title}
          </span>
          <span className={`text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 animate-count-in`}>
            {value}
          </span>
          {description && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {description}
            </span>
          )}
        </div>

        {icon && (
          <div className={`p-3 rounded-xl border shadow-sm transition-all duration-300 ${
            alert
              ? 'bg-amber-100/50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
              : 'bg-zinc-50 border-zinc-200/50 dark:bg-zinc-800/40 dark:border-zinc-800 dark:text-zinc-300'
          }`}>
            {icon}
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-out ${progressColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </Card>
  );
};
