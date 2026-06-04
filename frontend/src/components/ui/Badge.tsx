import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'active' | 'secondary';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ className = '', variant = 'default', children, ...props }: BadgeProps) => {
  const variantStyles = {
    default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-700/50',
    secondary: 'bg-zinc-50/50 text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400 border border-zinc-200/20 dark:border-zinc-800/30',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30',
    error: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/40 dark:border-rose-900/30',
    info: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-900/30',
    active: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-200/40 dark:border-teal-900/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none transition-all duration-300 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
