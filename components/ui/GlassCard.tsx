import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'tinted-sky' | 'tinted-emerald' | 'tinted-rose' | 'floating';
  interactive?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  interactive = false,
  ...props
}: GlassCardProps) {
  const variantStyles = {
    'default': 'bg-white/70 backdrop-blur-2xl border border-white/50 shadow-soft-float',
    'elevated': 'bg-white/85 backdrop-blur-2xl border border-white/80 shadow-soft-float',
    'floating': 'bg-white/90 backdrop-blur-2xl border border-white/60 shadow-soft-float hover:shadow-soft-float-hover',
    'tinted-sky': 'bg-gradient-to-br from-sky-50/70 via-white/75 to-blue-50/60 backdrop-blur-2xl border border-sky-100/60 shadow-soft-float',
    'tinted-emerald': 'bg-gradient-to-br from-emerald-50/70 via-white/75 to-teal-50/60 backdrop-blur-2xl border border-emerald-100/60 shadow-soft-float',
    'tinted-rose': 'bg-gradient-to-br from-rose-50/70 via-white/75 to-pink-50/60 backdrop-blur-2xl border border-rose-100/60 shadow-soft-float',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-[32px] transition-all duration-300',
          variantStyles[variant],
          interactive && 'hover:-translate-y-1 hover:shadow-soft-float-hover hover:border-white/90 cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
