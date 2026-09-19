'use client';

import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import {
  UserPlus,
  Stethoscope,
  Mail,
  Lock,
  Phone,
  MapPin,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  X,
  KeyRound,
  ShieldCheck,
  Calendar,
  Building,
  User,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { createDoctorFromAdmin, AdminCreateDoctorInput } from '@/lib/services/adminService';
import { DoctorProfile } from '@/lib/types/doctor';
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
  'Neurochirurgie',
  'Chirurgie Dentaire & Odontologie',
  'Psychiatrie & Santé Mentale',
  'ORL & Chirurgie Cervico-Faciale',
  'Rhumatologie & Traumatologie',
];

const OTHER_SPECIALITY_OPTION = 'Autre spécialité (préciser)';

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

interface AdminCreateDoctorModalProps {
  onClose: () => void;
  onSuccess: () => void;
  adminEmail: string;
}

export function AdminCreateDoctorModal({
  onClose,
  onSuccess,
  adminEmail,
}: AdminCreateDoctorModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState(MEDICAL_SPECIALITIES[0]);
  const [customSpeciality, setCustomSpeciality] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => `Telemed@${Math.random().toString(36).slice(-6)}!`);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('+221 ');
  const [city, setCity] = useState(SENEGAL_CITIES[0]);
  const [clinicName, setClinicName] = useState('Cabinet Médical');
  const [nin, setNin] = useState('');
  const [isRegisteredOnms, setIsRegisteredOnms] = useState(true);
  const [onmsNumber, setOnmsNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(5000);
  const [status, setStatus] = useState<'active' | 'pending'>('active');
  const [licenseDays, setLicenseDays] = useState<number>(90);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État de succès après création
  const [createdResult, setCreatedResult] = useState<{
    doctor: DoctorProfile;
    rawPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let newPw = 'Telemed@';
    for (let i = 0; i < 6; i++) {
      newPw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst || !cleanLast) {
      setError('Veuillez renseigner le prénom et le nom de famille.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.');
      return;
    }

    if (!password || password.trim().length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 9) {
      setError('Veuillez renseigner un numéro de téléphone valide.');
      return;
    }

    const effectiveSpeciality = selectedSpeciality === OTHER_SPECIALITY_OPTION
      ? customSpeciality.trim()
      : selectedSpeciality;

    if (!effectiveSpeciality) {
      setError('Veuillez préciser la spécialité médicale.');
      return;
    }

    setLoading(true);
    try {
      const input: AdminCreateDoctorInput = {
        firstName: cleanFirst,
        lastName: cleanLast,
        speciality: effectiveSpeciality,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city,
        clinicName: clinicName.trim() || 'Cabinet Médical',
        nin: nin.trim() || '1985010100000',
        onmsStatus: isRegisteredOnms && onmsNumber.trim() ? 'registered' : 'unregistered',
        onmsNumber: isRegisteredOnms && onmsNumber.trim() ? onmsNumber.trim().toUpperCase() : undefined,
        consultationFee: Number(consultationFee) || 5000,
        status,
        password: password.trim(),
        licenseDays: Number(licenseDays) || 90,
      };

      const result = await createDoctorFromAdmin(input, adminEmail);
      setCreatedResult(result);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B'],
      });

      onSuccess();
    } catch (err: any) {
      console.error('Erreur création praticien admin:', err);
      setError(err?.message || 'Une erreur est survenue lors de la création du compte praticien.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdResult) return;
    const { doctor, rawPassword } = createdResult;
    const text = `Bonjour ${doctor.fullName},\n\nVotre compte praticien sur TELEMED SENEGAL a été créé et validé avec succès par la Direction Médicale.\n\n🔗 Accès au cabinet : https://www.telemedsenegal.com\n📧 Identifiant (Email) : ${doctor.email}\n🔒 Mot de passe initial : ${rawPassword}\n\nVous pouvez dès à présent vous connecter pour configurer vos disponibilités et vos consultations.`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Erreur copie presse-papier:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm font-sans flex items-center justify-center p-3 sm:p-4">
      <GlassCard className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/80 p-5 sm:p-8 shadow-2xl rounded-[28px] my-4 mx-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SI LE COMPTE EST CRÉÉ -> ÉCRAN DE SUCCÈS & TRANSMISSION DES IDENTIFIANTS */}
        {createdResult ? (
          <div className="space-y-6 py-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <Badge variant="emerald" size="md" className="mb-2">
                Compte Praticien Créé avec Succès
              </Badge>
              <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                {createdResult.doctor.fullName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Le compte a été enregistré avec le statut <strong>{createdResult.doctor.status === 'active' ? 'Actif immédiatement' : 'En attente'}</strong>.
              </p>
            </div>

            {/* Fiche récapitulative des identifiants */}
            <div className="p-4 sm:p-5 rounded-[22px] bg-slate-50/90 border border-slate-200 text-left space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-bold">Identifiants de connexion :</span>
                <span className="text-[11px] text-emerald-700 font-bold font-sans bg-emerald-100 px-2 py-0.5 rounded-full">
                  Prêt à transmettre
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-sans font-bold">Email (Identifiant)</span>
                <span className="font-bold text-slate-900 text-sm">{createdResult.doctor.email}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-sans font-bold">Mot de passe temporaire</span>
                <span className="font-bold text-blue-600 text-sm tracking-wide bg-blue-50 px-2 py-1 rounded-md inline-block">
                  {createdResult.rawPassword}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 font-sans">
                Spécialité : <strong>{createdResult.doctor.speciality}</strong> • Téléphone : <strong>{createdResult.doctor.phone}</strong> • Tarif : <strong>{createdResult.doctor.consultationFee} FCFA</strong>
              </div>
            </div>

            {/* Boutons d'actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <GlassButton
                type="button"
                variant="primary"
                size="md"
                onClick={handleCopyCredentials}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Identifiants copiés !' : 'Copier les identifiants (WhatsApp / SMS)'}</span>
              </GlassButton>

              <GlassButton
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Fermer
              </GlassButton>
            </div>
          </div>
        ) : (
          /* FORMULAIRE DE CRÉATION DIRECTE */
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/20 mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <Badge variant="blue" className="mb-2">
                Administration Médicale
              </Badge>
              <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                Créer un Compte Praticien
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enregistrez et activez un confrère avec attribution directe de licence.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Prénom & Nom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Prénom du Praticien *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aminata"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Nom de Famille *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fall"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm font-medium"
                  />
                </div>
              </div>

              {/* Spécialité Médicale */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#3B82F6]" /> Spécialité Médicale *
                </label>
                <select
                  value={selectedSpeciality}
                  onChange={e => {
                    setSelectedSpeciality(e.target.value);
                    if (e.target.value !== OTHER_SPECIALITY_OPTION) setCustomSpeciality('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm font-medium"
                >
                  {MEDICAL_SPECIALITIES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value={OTHER_SPECIALITY_OPTION}>{OTHER_SPECIALITY_OPTION}</option>
                </select>

                {selectedSpeciality === OTHER_SPECIALITY_OPTION && (
                  <input
                    type="text"
                    required
                    placeholder="Précisez la spécialité médicale"
                    value={customSpeciality}
                    onChange={e => setCustomSpeciality(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 rounded-[16px] bg-white border border-blue-300 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                  />
                )}
              </div>

              {/* Email & Mot de Passe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#3B82F6]" /> Email Professionnel *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="dr.nom@telemed.sn"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#3B82F6]" /> Mot de passe *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" /> Générer
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Téléphone & Ville */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#3B82F6]" /> Téléphone Wave / OM *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+221 77 123 45 67"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" /> Ville d'exercice
                  </label>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm font-medium"
                  >
                    {SENEGAL_CITIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tarif & Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#3B82F6]" /> Tarif Consultation (FCFA) *
                  </label>
                  <input
                    type="number"
                    step={500}
                    min={1000}
                    required
                    value={consultationFee}
                    onChange={e => setConsultationFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#3B82F6]" /> Cabinet / Structure
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cabinet Médical Privé"
                    value={clinicName}
                    onChange={e => setClinicName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                  />
                </div>
              </div>

              {/* Situation Ordinale (ONMS) */}
              <div className="p-3.5 rounded-[20px] bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Situation Ordinale (ONMS)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRegisteredOnms(true)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        isRegisteredOnms
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Inscrit ONMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegisteredOnms(false)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        !isRegisteredOnms
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Jeune Diplômé
                    </button>
                  </div>
                </div>

                {isRegisteredOnms && (
                  <div>
                    <input
                      type="text"
                      placeholder="Numéro d'Ordre National des Médecins (Ex: 1234/ONMS)"
                      value={onmsNumber}
                      onChange={e => setOnmsNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-[14px] bg-white border border-slate-200 focus:border-[#3B82F6] focus:outline-none text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Options de Validation & Licence */}
              <div className="p-3.5 rounded-[20px] bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Statut Initial :
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'active' | 'pending')}
                    className="px-3 py-1 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800 focus:outline-none"
                  >
                    <option value="active">Actif Immédiatement (Recommandé)</option>
                    <option value="pending">En Attente de Validation</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Durée de licence offerte :
                  </span>
                  <select
                    value={licenseDays}
                    onChange={e => setLicenseDays(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 font-bold focus:outline-none"
                  >
                    <option value={90}>90 Jours (3 Mois)</option>
                    <option value={180}>180 Jours (6 Mois)</option>
                    <option value={365}>365 Jours (1 An)</option>
                    <option value={30}>30 Jours (1 Mois)</option>
                  </select>
                </div>
              </div>

              {/* Bouton de Soumission */}
              <div className="pt-2 flex items-center gap-3">
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={loading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Créer et Activer le Compte</span>
                </GlassButton>

                <GlassButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  className="w-auto px-5"
                >
                  Annuler
                </GlassButton>
              </div>
            </form>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
