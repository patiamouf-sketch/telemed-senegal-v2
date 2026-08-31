import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger' | 'success' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function GlassButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}: GlassButtonProps) {
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs font-semibold gap-1.5',
    md: 'px-5 py-2.5 text-sm font-semibold gap-2',
    lg: 'px-7 py-3.5 text-base font-bold gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 text-white shadow-pill hover:shadow-blue-500/35 hover:scale-[1.02] active:scale-[0.98]',
    secondary:
      'bg-white/90 text-[#1E293B] border border-slate-200/60 hover:bg-white hover:border-slate-300 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.98]',
    glass:
      'bg-white/60 text-blue-900 border border-white/80 backdrop-blur-xl hover:bg-white/90 shadow-glass-card hover:scale-[1.01] active:scale-[0.98]',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200/70 hover:bg-rose-100 hover:scale-[1.01] active:scale-[0.98]',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-pill-emerald hover:shadow-emerald-500/35 hover:scale-[1.02] active:scale-[0.98]',
    amber:
      'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]',
  };

  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-full transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer',
          sizeStyles[size],
          variantStyles[variant],
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Chargement...
        </>
      ) : (
        children
      )}
    </button>
  );
}
