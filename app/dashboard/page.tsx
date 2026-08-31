'use client';

import React from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Navbar } from '@/components/ui/Navbar';
import { DoctorDashboard } from '@/components/doctor/DoctorDashboard';
import { PendingApprovalView } from '@/components/doctor/PendingApprovalView';
import { DemoSwitcher } from '@/components/ui/DemoSwitcher';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Activity, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, doctorProfile, loading } = useAuth();

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
        <DemoSwitcher />
      </div>
    );
  }

  if (doctorProfile?.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2">
        <Navbar />
        <main className="flex-1">
          <PendingApprovalView />
        </main>
        <DemoSwitcher />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between pt-2 bg-[#F4F9FD]">
      <Navbar />
      <main className="flex-1">
        <DoctorDashboard />
      </main>
      <DemoSwitcher />
    </div>
  );
}
