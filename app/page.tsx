'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Navbar } from '@/components/ui/Navbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { FeaturesSection, Footer } from '@/components/landing/FeaturesSection';
import { AuthModal } from '@/components/auth/AuthModal';
import { DoctorOnboardingForm } from '@/components/auth/DoctorOnboardingForm';
import { PendingApprovalView } from '@/components/doctor/PendingApprovalView';
import { DoctorDashboard } from '@/components/doctor/DoctorDashboard';
import { DemoSwitcher } from '@/components/ui/DemoSwitcher';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { Activity, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export default function HomePage() {
  const { user, doctorProfile, loading, logout, refreshProfile } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F9FD]">
        <GlassCard className="p-8 text-center bg-white/80 max-w-xs shadow-xl">
          <Activity className="w-10 h-10 text-medical-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Chargement de TéléMed...</p>
        </GlassCard>
      </div>
    );
  }

  // 1. If NOT logged in -> Beautiful Landing Page with Doctor Login / Signup Modals
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2">
        <Navbar
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenSignup={() => setShowSignupModal(true)}
        />

        <main className="flex-1">
          <LandingHero
            onOpenLogin={() => setShowLoginModal(true)}
            onOpenSignup={() => setShowSignupModal(true)}
          />
          <FeaturesSection />
        </main>

        <Footer />

        {/* Modals */}
        {showLoginModal && (
          <AuthModal
            onClose={() => setShowLoginModal(false)}
            onSwitchToSignup={() => {
              setShowLoginModal(false);
              setShowSignupModal(true);
            }}
          />
        )}

        {showSignupModal && (
          <DoctorOnboardingForm
            onClose={() => setShowSignupModal(false)}
            onSuccess={() => setShowSignupModal(false)}
          />
        )}

        <DemoSwitcher />
      </div>
    );
  }

  // 2. If logged in & status is PENDING -> "En attente de validation par le Dr Thiam"
  if (doctorProfile?.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2">
        <Navbar />
        <main className="flex-1">
          <PendingApprovalView />
        </main>
        <Footer />
        <DemoSwitcher />
      </div>
    );
  }

  // 3. If logged in & status is REJECTED -> Notice
  if (doctorProfile?.status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16">
          <GlassCard className="p-8 text-center bg-white/90 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-[20px] bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <Badge variant="rose" size="md">
              Demande d'adhésion non validée
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900">Dossier Rejeté</h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Motif : <strong>{doctorProfile?.rejectionReason || 'Vérification ONMS non conforme'}</strong>.
            </p>
            <div className="pt-4 flex items-center justify-center gap-3">
              <GlassButton variant="primary" size="md" onClick={() => refreshProfile()}>
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </GlassButton>
              <GlassButton variant="secondary" size="md" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
                Déconnexion
              </GlassButton>
            </div>
          </GlassCard>
        </main>
        <Footer />
        <DemoSwitcher />
      </div>
    );
  }

  // 4. If logged in & status is ACTIVE -> Full Doctor Dashboard
  return (
    <div className="min-h-screen flex flex-col justify-between pt-2">
      <Navbar />
      <main className="flex-1">
        <DoctorDashboard />
      </main>
      <Footer />
      <DemoSwitcher />
    </div>
  );
}
