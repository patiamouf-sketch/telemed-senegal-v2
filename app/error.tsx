'use client';

import React, { useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, RefreshCw, Home, Phone } from 'lucide-react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur applicative interceptée:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] font-sans">
      <GlassCard className="p-8 sm:p-10 text-center bg-white shadow-2xl max-w-lg space-y-6 border border-rose-100">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <Badge variant="rose" size="md">
            Protection Médicale Active
          </Badge>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Interruption Temporaire de Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Une exception technique a été interceptée par le système de sécurité de <strong>TELEMED SENEGAL</strong>. Vos données de téléconsultation et votre session sont protégées.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-slate-50 rounded-xl text-left font-mono text-[11px] text-slate-600 border border-slate-200 overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <GlassButton
            variant="primary"
            size="md"
            onClick={() => reset()}
            className="w-full sm:w-auto text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </GlassButton>

          <Link href="/" className="w-full sm:w-auto">
            <GlassButton
              variant="secondary"
              size="md"
              className="w-full text-xs"
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </GlassButton>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Phone className="w-3.5 h-3.5 text-blue-600" />
          <span>Assistance Direction : <strong>+221 78 106 92 98</strong></span>
        </div>
      </GlassCard>
    </div>
  );
}
