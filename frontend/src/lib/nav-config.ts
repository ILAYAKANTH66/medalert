import {
  ClipboardList,
  Pill,
  Bell,
  Settings,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: ClipboardList, roles: ['PATIENT', 'CARETAKER'] },
  { href: '/medicines', label: 'Medicines', icon: Pill, roles: ['PATIENT'] },
  { href: '/notifications', label: 'Alerts', icon: Bell, roles: ['PATIENT'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['PATIENT'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['PATIENT', 'CARETAKER'] },
];

export function filterNavByRole(role: UserRole | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role ?? 'PATIENT'));
}

export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}
