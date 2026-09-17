'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassButton } from './GlassButton';
import { Badge } from './Badge';
import { RefreshButton } from './RefreshButton';
import { Activity, ShieldCheck, LogOut, Stethoscope, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
}

export function Navbar({ onOpenLogin, onOpenSignup }: NavbarProps) {
  const { user, doctorProfile, isAdmin, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="relative pt-3 sm:pt-4 px-2 sm:px-8 max-w-7xl mx-auto w-full">
      <nav className="bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-full px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between transition-all duration-300">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight text-[#0F172A] whitespace-nowrap">
                TELEMED <span className="text-[#3B82F6]">SENEGAL</span>
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider hidden sm:block">
              Direction Médicale • Service de Téléconsultation
            </p>
          </div>
        </Link>

        {/* Navigation / CTA Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          <RefreshButton title="Actualiser la page" />

          {mounted && user ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              {user.email?.toLowerCase() === 'pati.amouf@gmail.com' && (
                <Link href="/admin-thiam" title="Espace Direction">
                  <GlassButton size="sm" variant="glass" className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs text-blue-900 border-blue-200/60 bg-blue-50/70 hover:bg-blue-100/70">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3B82F6]" />
                    <span className="hidden sm:inline">Direction</span>
                  </GlassButton>
                </Link>
              )}

              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-[#0F172A]">
                  {doctorProfile?.fullName || user.email}
                </span>
                <span className="text-[11px] text-slate-500">
                  {doctorProfile?.speciality || 'Praticien'}
                </span>
              </div>

              {doctorProfile?.status && (
                <Badge
                  variant={
                    doctorProfile.status === 'active'
                      ? 'emerald'
                      : doctorProfile.status === 'pending'
                      ? 'amber'
                      : 'rose'
                  }
                  size="sm"
                  className="capitalize hidden sm:inline-flex"
                >
                  {doctorProfile.status === 'active'
                    ? 'Validé ONMS'
                    : doctorProfile.status === 'pending'
                    ? 'En attente'
                    : 'Rejeté'}
                </Badge>
              )}

              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => logout()}
                className="px-2 sm:px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600"
                title="Déconnexion"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quitter</span>
              </GlassButton>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                onClick={onOpenLogin}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#1E293B] hover:text-[#3B82F6] transition-colors whitespace-nowrap"
              >
                Espace Médecin
              </button>

              <GlassButton
                size="sm"
                variant="primary"
                onClick={onOpenSignup}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Adhésion</span>
              </GlassButton>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
