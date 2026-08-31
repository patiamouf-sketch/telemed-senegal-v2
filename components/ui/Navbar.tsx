'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassButton } from './GlassButton';
import { Badge } from './Badge';
import { Activity, ShieldCheck, LogOut, Stethoscope, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
}

export function Navbar({ onOpenLogin, onOpenSignup }: NavbarProps) {
  const { user, doctorProfile, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <nav className="bg-white/75 backdrop-blur-2xl border border-white/60 shadow-soft-float rounded-full px-6 py-3 flex items-center justify-between transition-all duration-300">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#0F172A]">
                TéléMed <span className="text-[#3B82F6]">Sénégal</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                V2
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
              Thiam Global Business
            </p>
          </div>
        </Link>

        {/* Navigation / CTA Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link href="/admin-thiam">
                  <GlassButton size="sm" variant="glass" className="text-amber-900 border-amber-200/60 bg-amber-50/70 hover:bg-amber-100/70">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span className="hidden sm:inline">Super-Admin</span>
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
                className="text-slate-600 hover:text-rose-600"
                title="Déconnexion"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quitter</span>
              </GlassButton>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#1E293B] hover:text-[#3B82F6] transition-colors"
              >
                Espace Médecin
              </button>

              <GlassButton
                size="sm"
                variant="primary"
                onClick={onOpenSignup}
                className="text-xs sm:text-sm"
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
