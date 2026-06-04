import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ label = 'Loading...', className, fullScreen }: LoadingSpinnerProps) {
  const inner = (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <Activity className="h-8 w-8 text-teal-600 animate-spin" />
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        {inner}
      </div>
    );
  }

  return inner;
}
