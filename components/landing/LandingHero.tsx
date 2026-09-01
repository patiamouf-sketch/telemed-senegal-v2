'use client';

import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { Stethoscope, ShieldCheck, ArrowRight, Sparkles, Smartphone, CheckCircle, Lock } from 'lucide-react';

interface LandingHeroProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
}

export function LandingHero({ onOpenLogin, onOpenSignup }: LandingHeroProps) {
  return (
    <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-sky-200/60 shadow-sm text-xs font-bold text-[#0F172A] animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-[#3B82F6] animate-pulse" />
          <span>TELEMED SENEGAL • Direction Médicale</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          <span className="text-[#3B82F6] font-bold">Licence 30 jours offerte</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
          La Télémédecine Nouvelle Génération pour les{' '}
          <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-teal-500 bg-clip-text text-transparent">
            Jeunes Médecins Libéraux
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Déployez votre cabinet médical digital en 2 minutes. Liens patients éphémères sans téléchargement, validation ONMS certifiée et encaissement direct via Wave & Orange Money.
        </p>

        {/* Main 2 CTA Buttons */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <GlassButton
            size="lg"
            variant="primary"
            onClick={onOpenLogin}
            className="w-full sm:w-auto text-base"
          >
            <Stethoscope className="w-5 h-5" />
            <span>Espace Médecin</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-80" />
          </GlassButton>

          <GlassButton
            size="lg"
            variant="secondary"
            onClick={onOpenSignup}
            className="w-full sm:w-auto text-base"
          >
            <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
            <span>Adhésion & Inscription</span>
          </GlassButton>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Conformité ONMS Sénégal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#3B82F6]" />
            <span>Paiements Wave & Orange Money</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-indigo-500" />
            <span>Données Médicales Chiffrées</span>
          </div>
        </div>
      </div>

      {/* Floating 32px Showcase Card */}
      <div className="mt-16 max-w-4xl mx-auto">
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Column 1: Verification */}
            <div className="p-5 rounded-[24px] bg-white border border-slate-100/90 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center font-extrabold text-sm">
                01
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Adhésion & NIN</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Formulaire d'inscription avec vérification ordinale par la Direction Médicale.
              </p>
            </div>

            {/* Column 2: Ephemeral Patient Room */}
            <div className="p-5 rounded-[24px] bg-white border border-slate-100/90 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-extrabold text-sm">
                02
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Lien /dr/[slug]</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Votre lien personnalisé à partager sur WhatsApp. Le patient entre sans installer d'application.
              </p>
            </div>

            {/* Column 3: 30 Days License */}
            <div className="p-5 rounded-[24px] bg-white border border-slate-100/90 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold text-sm">
                03
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Licence 30 Jours</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accès complet accordé dès validation par la Direction Médicale pour lancer votre activité libérale.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
