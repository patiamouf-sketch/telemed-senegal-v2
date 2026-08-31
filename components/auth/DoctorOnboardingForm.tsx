'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { Stethoscope, ShieldAlert, Phone, CreditCard, User, MapPin, Mail, Lock, CheckCircle2, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const MEDICAL_SPECIALITIES = [
  'Médecine Générale',
  'Pédiatrie & Santé Maternelle',
  'Gynécologie - Obstétrique',
  'Cardiologie & Maladies Vasculaires',
  'Dermatologie & Vénérologie',
  'Ophtalmologie',
  'Pneumologie & Allergologie',
  'Endocrinologie & Diabétologie',
  'Neurologie',
  'Psychiatrie & Santé Mentale',
  'ORL & Chirurgie Cervico-Faciale',
  'Rhumatologie & Traumatologie',
];

const SENEGAL_CITIES = [
  'Dakar (Plateau / Almadies / Mermoz)',
  'Thiès',
  'Saint-Louis',
  'Mbour / Saly',
  'Ziguinchor',
  'Kaolack',
  'Touba / Mbacké',
  'Tambacounda',
  'Autre région',
];

interface DoctorOnboardingFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function DoctorOnboardingForm({ onClose, onSuccess }: DoctorOnboardingFormProps) {
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    speciality: MEDICAL_SPECIALITIES[0],
    onmsNumber: '',
    nin: '',
    phone: '+221 ',
    clinicName: '',
    city: SENEGAL_CITIES[0],
    consultationFee: 7000,
    bio: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/^dr\.?\s*/i, 'dr-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError('Veuillez renseigner votre Nom et Prénom.');
      return;
    }
    if (!formData.onmsNumber.trim()) {
      setError('Le numéro d’inscription ONMS est obligatoire pour la conformité médicale.');
      return;
    }
    if (!formData.nin.trim()) {
      setError('Le Numéro d’Identification Nationale (NIN) est requis.');
      return;
    }
    if (!formData.phone || formData.phone.length < 9) {
      setError('Veuillez renseigner un numéro de téléphone Wave / Orange Money valide.');
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(formData.fullName) || `dr-${Date.now()}`;
      await signup(
        {
          fullName: formData.fullName.startsWith('Dr') ? formData.fullName : `Dr. ${formData.fullName}`,
          email: formData.email,
          speciality: formData.speciality,
          onmsNumber: formData.onmsNumber.toUpperCase(),
          nin: formData.nin,
          phone: formData.phone,
          clinicName: formData.clinicName || 'Cabinet Privé',
          city: formData.city,
          slug,
          consultationFee: Number(formData.consultationFee) || 7000,
          avisMedicalFee: 3000,
          visioConsultationFee: 7000,
          waveNumber: formData.phone,
          omNumber: formData.phone,
          bio: formData.bio || `Médecin spécialiste en ${formData.speciality}`,
          availableForTeleconsult: true,
        },
        formData.password || 'password123'
      );

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#60A5FA', '#10B981', '#F59E0B']
      });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md overflow-y-auto font-sans">
      <GlassCard className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-8 my-8 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/20 mb-3">
            <Stethoscope className="w-6 h-6" />
          </div>
          <Badge variant="blue" className="mb-2">
            Adhésion Médecin Libéral
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Rejoignez TéléMed Sénégal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Plateforme réservée aux praticiens diplômés et inscrits au tableau de l’Ordre (ONMS).
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Nom & Prénom du Praticien *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Dr. Aminata Fall"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#3B82F6]" /> Spécialité Médicale *
              </label>
              <select
                value={formData.speciality}
                onChange={e => setFormData({ ...formData, speciality: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
              >
                {MEDICAL_SPECIALITIES.map(spec => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#3B82F6]" /> N° Ordre des Médecins (ONMS) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: SN-ONMS-7821"
                value={formData.onmsNumber}
                onChange={e => setFormData({ ...formData, onmsNumber: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] font-mono shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#3B82F6]" /> N° Identification Nationale (NIN) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 1990102400123"
                value={formData.nin}
                onChange={e => setFormData({ ...formData, nin: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] font-mono shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#3B82F6]" /> Téléphone Pro (Wave / OM) *
              </label>
              <input
                type="tel"
                required
                placeholder="+221 77 123 45 67"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> Ville d'exercice
              </label>
              <select
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
              >
                {SENEGAL_CITIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#3B82F6]" /> Email Professionnel *
              </label>
              <input
                type="email"
                required
                placeholder="dr.nom@telemed.sn"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#3B82F6]" /> Mot de passe sécurisé *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
              />
            </div>
          </div>

          {/* Note sur la validation Super-Admin */}
          <div className="p-4 bg-blue-50/60 rounded-[24px] border border-blue-100 text-[11px] text-[#1E293B] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#0F172A]">Processus de vérification médicale :</span> Votre compte sera créé avec le statut <span className="font-semibold underline">en attente de validation</span>. Le Dr Thiam vérifiera votre numéro ONMS et NIN sous 24h et vous accordera <strong>90 jours d’accès gratuit</strong>.
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            {onClose && (
              <GlassButton type="button" variant="secondary" size="md" onClick={onClose}>
                Annuler
              </GlassButton>
            )}
            <GlassButton type="submit" variant="primary" size="md" isLoading={loading} className="w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4" />
              Soumettre ma demande d'adhésion
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
