"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LogOut, ChevronDown, Key } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePatientApp } from "@/providers/PatientAppProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { filterNavByRole, isNavActive, type NavItem } from "@/lib/nav-config";
import { useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

function SidebarLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-teal-600/10 text-teal-800 ring-1 ring-teal-600/15 nav-active-glow"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-teal-600")} />
      <span>{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children, title, description, actions }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { pendingCount } = usePatientApp();
  const [profileOpen, setProfileOpen] = useState(false);

  const filteredNav = filterNavByRole(user?.role);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] flex">
      {/* Desktop sidebar — sole primary nav */}
      <aside className="hidden md:flex w-[var(--sidebar-width)] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)]">
        <div className="flex h-14 items-center gap-2.5 border-b border-[var(--border-subtle)] px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-sm">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">MedAlert</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5" aria-label="Main navigation">
          {filteredNav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isNavActive(pathname, item.href)}
              badge={item.href === "/notifications" ? pendingCount : undefined}
            />
          ))}
        </nav>

        {user?.role === "PATIENT" && user.caretakerToken && (
          <div className="m-3 mt-0 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-1.5">
              <Key className="h-3 w-3" />
              Caretaker token
            </div>
            <p className="font-mono text-[11px] font-semibold text-slate-800 break-all select-all">
              {user.caretakerToken}
            </p>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[var(--mobile-nav-height)] md:pb-0">
        {/* Compact topbar — profile & page context only */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface)]/95 px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 flex-col md:hidden">
            <Link href="/dashboard" className="text-sm font-bold text-[var(--text-primary)]">MedAlert</Link>
          </div>
          <div className="hidden md:block min-w-0 flex-1">
            {title && (
              <h1 className="text-base font-semibold text-[var(--text-primary)] truncate">{title}</h1>
            )}
            {description && (
              <p className="text-xs text-[var(--text-muted)] truncate">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {actions}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <span className="max-w-[100px] truncate hidden sm:inline">{user?.name}</span>
                <Badge variant={user?.role === "PATIENT" ? "active" : "info"}>
                  {user?.role === "PATIENT" ? "Patient" : "Caretaker"}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
                  <div className="absolute right-0 mt-1 w-44 rounded-xl border border-[var(--border-subtle)] bg-white py-1 shadow-lg z-50">
                    {user?.role === "PATIENT" && (
                      <Link
                        href="/settings"
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setProfileOpen(false)}
                      >
                        Settings
                      </Link>
                    )}
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      onClick={() => { setProfileOpen(false); logout(); }}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 animate-page-enter">
            {(title || description) && (
              <div className="mb-5 md:hidden">
                <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
                {description && <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden h-[var(--mobile-nav-height)] items-stretch justify-around border-t border-[var(--border-subtle)] bg-[var(--surface)] px-1 safe-area-pb"
        aria-label="Mobile navigation"
      >
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          const showBadge = item.href === "/notifications" && pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors max-w-[80px]",
                active ? "text-teal-700" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-teal-600")} />
              <span>{item.label}</span>
              {showBadge && (
                <span className="absolute top-1 right-1/4 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
