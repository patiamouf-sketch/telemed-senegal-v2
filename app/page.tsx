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
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { Activity, AlertTriangle, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

export default function HomePage() {
  const { user, doctorProfile, loading, logout, refreshProfile } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F9FD]">
        <GlassCard className="p-8 text-center bg-white/80 max-w-xs shadow-xl">
          <Activity className="w-10 h-10 text-medical-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Accès à TELEMED SENEGAL...</p>
        </GlassCard>
      </div>
    );
  }

  // 1. If NOT logged in -> Landing Page with Login / Signup Modals
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
      </div>
    );
  }

  // 2. If logged in & status is BANNED or BLOCKED -> Suspension Screen
  if (doctorProfile?.status === 'banned' || doctorProfile?.status === 'blocked') {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2 bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 flex items-center justify-center">
          <GlassCard className="p-8 text-center bg-white shadow-2xl space-y-5 border-rose-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <Badge variant="rose" size="md">
              Compte Suspendu / Révoqué
            </Badge>
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
              Pour toute réclamation ou régularisation de dossier, veuillez contacter la Direction Générale au <strong>+221 78 106 92 98</strong>.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <GlassButton variant="secondary" size="md" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
                Déconnexion
              </GlassButton>
            </div>
          </GlassCard>
        </main>
        <Footer />
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
              Motif : <strong>{doctorProfile?.rejectionReason || 'Vérification de conformité non satisfaite'}</strong>.
            </p>
            <p className="text-xs text-slate-500">
              Contact Direction Générale : <strong>+221 78 106 92 98</strong>
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
      </div>
    );
  }

  // 5. If logged in & status is ACTIVE -> Full Doctor Dashboard
  return (
    <div className="min-h-screen flex flex-col justify-between pt-2">
      <Navbar />
      <main className="flex-1">
        <DoctorDashboard />
      </main>
      <Footer />
    </div>
  );
}
