import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'sky' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate' | 'blue';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  className,
  variant = 'sky',
  size = 'sm',
  ...props
}: BadgeProps) {
  const variantStyles = {
    sky: 'bg-sky-50 text-sky-700 border-sky-200/60',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/60',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/60',
  };

  const sizeStyles = {
    sm: 'px-3 py-0.5 text-xs font-semibold rounded-full',
    md: 'px-3.5 py-1 text-xs font-bold rounded-full',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 border shadow-sm backdrop-blur-md transition-all',
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
