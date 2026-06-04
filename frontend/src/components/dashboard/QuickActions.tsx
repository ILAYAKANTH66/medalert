import Link from 'next/link';
import { Plus, Pill, Bell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onEnableNotifications?: () => void;
  showNotificationPrompt?: boolean;
}

export function QuickActions({ onEnableNotifications, showNotificationPrompt }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Link href="/medicines/new">
          <Button variant="default" className="w-full justify-start gap-2 h-10">
            <Plus className="h-4 w-4" />
            Add medicine
          </Button>
        </Link>
        <Link href="/medicines">
          <Button variant="outline" className="w-full justify-start gap-2 h-10">
            <Pill className="h-4 w-4" />
            Manage medicines
          </Button>
        </Link>
        {showNotificationPrompt && onEnableNotifications && (
          <Button
            variant="secondary"
            className="w-full justify-start gap-2 h-10"
            onClick={onEnableNotifications}
          >
            <Bell className="h-4 w-4" />
            Enable reminders
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

