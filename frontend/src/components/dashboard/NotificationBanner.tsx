import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationBannerProps {
  onEnable: () => void;
}

export function NotificationBanner({ onEnable }: NotificationBannerProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Enable background reminders</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Get persistent dose alerts every minute until you log your dose — even when the tab is closed.
          </p>
        </div>
      </div>
      <Button onClick={onEnable} className="shrink-0 self-end sm:self-center bg-teal-600 hover:bg-teal-700">
        Enable alerts
      </Button>
    </div>
  );
}

