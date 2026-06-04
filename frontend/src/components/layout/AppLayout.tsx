"use client";

import { AppShell } from "./AppShell";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

/** @deprecated Use AppShell — kept for backward compatibility with existing pages */
export function AppLayout(props: AppLayoutProps) {
  return <AppShell {...props} />;
}
