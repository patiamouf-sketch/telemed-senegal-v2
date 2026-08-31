'use client';

import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import { Video, ShieldCheck, CreditCard, Clock, CheckCircle2 } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: ShieldCheck,
      color: 'blue',
      title: 'Vérification Ordre (ONMS) & NIN',
      desc: 'Chaque médecin inscrit fait l’objet d’une validation manuelle par la direction médicale Thiam Global Business.',
      badge: 'Conformité 100%',
    },
    {
      icon: Video,
      color: 'emerald',
      title: 'Accès Patient Éphémère /dr/[slug]',
      desc: 'Un lien web direct envoyé au patient via SMS/WhatsApp. Aucune création de compte requise pour le patient.',
      badge: 'Zéro friction',
    },
    {
      icon: CreditCard,
      color: 'purple',
      title: 'Wave & Orange Money Intégrés',
      desc: 'Définissez vos honoraires de consultation et recevez les règlements directement sur vos comptes mobiles locaux.',
      badge: 'Sénégal & UEMOA',
    },
    {
      icon: Clock,
      color: 'amber',
      title: 'Licence 90 Jours Offerte',
      desc: 'Lancez votre patientèle libérale sans frais initiaux avec 3 mois de couverture complète du service SaaS.',
      badge: 'Offre Tremplin',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Badge variant="blue" className="mb-2">
          Architecture V2
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Conçu sur mesure pour la médecine libérale
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Une expérience de téléconsultation fluide, moderne et respectueuse du secret médical.
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
                <span>Inclus dans le SaaS</span>
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
    <footer className="mt-20 border-t border-sky-100/60 bg-white/40 backdrop-blur-md py-10 px-4 sm:px-8 text-center text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-[#0F172A]">
          <span>TéléMed Sénégal V2</span>
          <span>•</span>
          <span className="text-[#3B82F6]">Thiam Global Business</span>
        </div>
        <div>
          Conforme à la législation sanitaire et à l'Ordre National des Médecins du Sénégal (ONMS).
        </div>
        <div>
          © {new Date().getFullYear()} Thiam Global Business. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
