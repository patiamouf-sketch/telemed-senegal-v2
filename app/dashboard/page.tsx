'use client';

import React from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Navbar } from '@/components/ui/Navbar';
import { DoctorDashboard } from '@/components/doctor/DoctorDashboard';
import { PendingApprovalView } from '@/components/doctor/PendingApprovalView';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ShieldAlert, LogOut, Activity, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, doctorProfile, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F9FD]">
        <GlassCard className="p-8 text-center bg-white/80 max-w-xs shadow-xl">
          <Activity className="w-10 h-10 text-medical-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Accès au Dashboard...</p>
        </GlassCard>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <GlassCard className="p-8 text-center bg-white/90 max-w-md space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Espace Praticien Requis</h2>
            <p className="text-xs text-slate-500">
              Veuillez vous connecter pour accéder à votre tableau de bord médical.
            </p>
            <Link href="/">
              <GlassButton variant="primary" size="md">
                <LogIn className="w-4 h-4" />
                Se connecter
              </GlassButton>
            </Link>
          </GlassCard>
        </main>
      </div>
    );
  }

  if (doctorProfile?.status === 'banned' || doctorProfile?.status === 'blocked') {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2 bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 flex items-center justify-center">
          <GlassCard className="p-8 text-center bg-white shadow-2xl space-y-5 border-rose-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Accès Praticien Désactivé</h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              L'accès à votre cabinet de téléconsultation a été suspendu par la Direction Médicale de <strong>TELEMED SENEGAL</strong>.
            </p>
            {doctorProfile.banReason && (
              <div className="p-3 bg-rose-50 rounded-xl text-xs text-rose-900 font-medium">
                Motif : {doctorProfile.banReason}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Contact Direction Générale : <strong>+221 78 106 92 98</strong>
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <GlassButton variant="secondary" size="md" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
                Déconnexion
              </GlassButton>
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between pt-2 bg-[#F4F9FD]">
      <Navbar />
      <main className="flex-1">
        <DoctorDashboard />
      </main>
    </div>
  );
}
