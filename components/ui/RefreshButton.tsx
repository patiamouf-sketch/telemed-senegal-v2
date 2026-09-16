'use client';

import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';

interface RefreshButtonProps {
  className?: string;
  title?: string;
}

export function RefreshButton({
  className = '',
  title = 'Actualiser l\'application',
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 450);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className={`p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 hover:bg-blue-50 text-slate-600 hover:text-[#3B82F6] hover:border-blue-200 transition-all shadow-sm flex items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 ${
        isRefreshing ? 'opacity-80 ring-2 ring-blue-400/20' : ''
      } ${className}`}
      title={title}
      aria-label={title}
    >
      <RotateCw
        className={`w-4 h-4 transition-transform duration-500 ${
          isRefreshing ? 'animate-spin text-[#3B82F6]' : ''
        }`}
      />
    </button>
  );
}
