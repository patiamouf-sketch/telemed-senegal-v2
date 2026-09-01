'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { Clock, ShieldCheck, Stethoscope, Phone, CreditCard, RefreshCw, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { approveDoctor } from '@/lib/services/adminService';
import confetti from 'canvas-confetti';

export function PendingApprovalView() {
  const { doctorProfile, refreshProfile, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulatingApprove, setIsSimulatingApprove] = useState(false);

  // Écouteur en temps réel automatique : vérifie toutes les 2 secondes si le Super-Admin a validé le compte
  useEffect(() => {
    refreshProfile();
    const interval = setInterval(async () => {
      await refreshProfile();
    }, 2000);
    return () => clearInterval(interval);
  }, [refreshProfile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSimulateApproval = async () => {
    if (!doctorProfile) return;
    setIsSimulatingApprove(true);
    await approveDoctor(doctorProfile.id);
    await refreshProfile();
    setIsSimulatingApprove(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Status Glass Card */}
        <GlassCard className="p-6 sm:p-10 text-center space-y-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-white shadow-xl shadow-amber-500/20 mb-2 animate-bounce">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="amber" size="md">
              Statut : En cours d'examen
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              En attente de validation médicale
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Bienvenue, <span className="font-bold text-[#0F172A]">{doctorProfile?.fullName}</span>. Votre dossier d'inscription a été transmis à la direction médicale de <strong>TELEMED SENEGAL</strong> pour vérification de conformité et activation de votre licence.
            </p>
          </div>

          {/* Dossier Summary Table */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 text-left space-y-3 text-xs sm:text-sm shadow-sm">
            <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#3B82F6]" />
              Récapitulatif de votre dossier praticien
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0" />
                <span>Spécialité : <strong>{doctorProfile?.speciality}</strong></span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>N° ONMS : <strong>{doctorProfile?.onmsNumber || 'En cours'}</strong></span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>NIN : <strong>{doctorProfile?.nin}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>Téléphone : <strong>{doctorProfile?.phone}</strong></span>
              </div>
            </div>
          </div>

          {/* Verification Timeline / Steps */}
          <div className="border-t border-slate-100 pt-5 text-left">
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                1. Demande Reçue
              </div>
              <div className="p-3 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200 animate-pulse">
                <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                2. Examen Direction
              </div>
              <div className="p-3 rounded-full bg-slate-50 text-slate-400 font-medium border border-slate-100">
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                3. Licence 90j Active
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <GlassButton
              variant="primary"
              size="md"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              className="w-full sm:w-auto text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualiser le statut
            </GlassButton>

            <a
              href="https://wa.me/221770000000?text=Bonjour%20Dr%20Thiam,%20je%20viens%20de%20soumettre%20mon%20dossier%20sur%20TeleMed%20Senegal"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <GlassButton variant="secondary" size="md" className="w-full text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Direction
              </GlassButton>
            </a>

            <GlassButton
              variant="secondary"
              size="md"
              onClick={() => logout()}
              className="w-full sm:w-auto text-slate-600 text-xs"
            >
              Déconnexion
            </GlassButton>
          </div>

          {/* Simulation Box for Rapid Review */}
          <div className="pt-4 border-t border-dashed border-amber-200">
            <div className="p-4 rounded-[24px] bg-amber-50/70 border border-amber-200 text-left flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-amber-900 block">⚡ Mode Test : Valider immédiatement</span>
                <span className="text-[11px] text-amber-700">Simule la validation par le Super-Admin avec +90j de licence.</span>
              </div>
              <GlassButton
                size="sm"
                variant="success"
                onClick={handleSimulateApproval}
                isLoading={isSimulatingApprove}
                className="flex-shrink-0 text-xs"
              >
                Simuler Approbation
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
