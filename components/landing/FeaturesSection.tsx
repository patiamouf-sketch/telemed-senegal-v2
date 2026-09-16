'use client';

import React from 'react';
import Link from 'next/link';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { MessageSquare, ShieldCheck, CreditCard, Clock, CheckCircle2 } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: CreditCard,
      color: 'purple',
      title: 'Honoraires Wave & Orange Money',
      desc: 'Fixez librement vos tarifs. Le patient règle sa consultation avant d\'entrer en salle et les fonds arrivent directement sur votre compte.',
      badge: 'Encaissement 100% Direct',
    },
    {
      icon: MessageSquare,
      color: 'emerald',
      title: 'Téléconsultation Audio & Imagerie',
      desc: 'Échanges fluides par notes vocales, photos médicales et messagerie sécurisée via votre lien /dr/[slug]. Zéro friction réseau.',
      badge: 'Faible bande passante',
    },
    {
      icon: ShieldCheck,
      color: 'blue',
      title: 'Ordonnances Scellées & ONMS',
      desc: 'Émettez des ordonnances médicales certifiées avec QR Code et preuve cryptographique SHA-256 infalsifiable pour sécuriser vos actes.',
      badge: 'Preuve Cryptographique',
    },
    {
      icon: Clock,
      color: 'amber',
      title: 'Licence 30 Jours Offerte',
      desc: 'Lancez votre activité libérale sans investissement initial : 30 jours complets offerts pour bâtir votre patientèle et vos revenus.',
      badge: 'Offre Tremplin',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Badge variant="blue" className="mb-2">
          Architecture Médicale V2
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Conçu pour valoriser la médecine libérale au Sénégal
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Une solution concrète pour exercer en toute indépendance, sécuriser vos avis médicaux et vivre dignement de votre profession.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, idx) => {
          const Icon = f.icon;
          return (
            <GlassCard key={idx} interactive className="p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shadow-sm">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant={f.color as any} size="sm">
                    {f.badge}
                  </Badge>
                </div>
                <h3 className="font-extrabold text-[#0F172A] text-base mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-[#3B82F6]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Inclus dans TELEMED SENEGAL</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white/70 backdrop-blur-xl py-10 px-4 sm:px-8 text-center text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-6">
        
        {/* Ligne 1 : Titre & Direction */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>TELEMED SENEGAL V2</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-medium">Plateforme Nationale de Télémédecine</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
            <Link href="/cgu" className="hover:text-blue-600 transition-colors underline underline-offset-4">
              Conditions Générales d&apos;Utilisation & Consentement
            </Link>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Conforme ONMS & Loi CDP Sénégal n° 2008-12
            </span>
          </div>
        </div>

        {/* Ligne 2 : Avertissement Urgences SAMU 15 */}
        <div className="w-full p-3 rounded-2xl bg-red-50/70 border border-red-200 text-red-800 text-[11px] sm:text-xs flex flex-col sm:flex-row items-center justify-center gap-2 shadow-sm">
          <span className="font-extrabold uppercase tracking-wide flex items-center gap-1 text-red-900">
            🚨 Urgences Vitales :
          </span>
          <span>TELEMED n&apos;est pas un service d&apos;urgence. En cas de détresse médicale, composez immédiatement le <strong>15 (SAMU)</strong> ou le <strong>18 (Sapeurs-Pompiers)</strong>.</span>
        </div>

        {/* Ligne 3 : Direction & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full text-[11px] text-slate-400 gap-2">
          <div>
            Dr. Elhadji Pathé THIAM, Directeur Général de THIAM GLOBAL BUSINESS, Pharmacien et Informaticien • <strong>+221 78 106 92 98</strong>
          </div>
          <div>
            © {new Date().getFullYear()} TELEMED SENEGAL. Tous droits réservés.
          </div>
        </div>

      </div>
    </footer>
  );
}
