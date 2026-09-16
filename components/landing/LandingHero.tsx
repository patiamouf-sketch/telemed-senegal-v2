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
          <span>TELEMED SENEGAL • La plateforme des praticiens diplômés</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          <span className="text-[#3B82F6] font-bold">Licence 30 jours offerte</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
          Votre temps médical a de la valeur.{' '}
          <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-teal-500 bg-clip-text text-transparent">
            Monétisez vos téléconsultations en toute simplicité.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Fini les avis informels gratuits sur WhatsApp. Déployez votre cabinet médical digital en 2 minutes, partagez votre lien personnalisé et encaissez vos honoraires garantis sur <strong>Wave & Orange Money</strong> avant chaque échange.
        </p>

        {/* Main 2 CTA Buttons */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <GlassButton
            size="lg"
            variant="primary"
            onClick={onOpenLogin}
            className="w-full sm:w-auto text-base shadow-lg shadow-blue-500/20"
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
            <span>Paiement Garanti Avant Échange</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-[#3B82F6]" />
            <span>Encaissements Wave & Orange Money Directs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-indigo-500" />
            <span>Ordonnances Scellées Conformes ONMS</span>
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
                Inscription simplifiée avec vérification confraternelle rapide par la Direction Médicale.
              </p>
            </div>

            {/* Column 2: Ephemeral Patient Room */}
            <div className="p-5 rounded-[24px] bg-white border border-slate-100/90 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-extrabold text-sm">
                02
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Lien /dr/[slug]</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Partagez votre lien sur WhatsApp. Le patient règle sa consultation et entre sans rien télécharger.
              </p>
            </div>

            {/* Column 3: 30 Days License */}
            <div className="p-5 rounded-[24px] bg-white border border-slate-100/90 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold text-sm">
                03
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Licence 30 Jours Offerte</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accès complet accordé immédiatement pour développer vos revenus libéraux en toute indépendance.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
