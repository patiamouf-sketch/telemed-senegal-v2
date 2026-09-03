'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { 
  Stethoscope, 
  ShieldAlert, 
  ShieldCheck,
  Phone, 
  CreditCard, 
  User, 
  MapPin, 
  Mail, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  X, 
  UploadCloud, 
  Camera, 
  Image as ImageIcon, 
  Check, 
  AlertCircle, 
} from 'lucide-react';
import { uploadMedia } from '@/lib/services/storageService';
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

  // Situation ordinale (Inscrit ONMS vs Non encore inscrit)
  const [isRegisteredOnms, setIsRegisteredOnms] = useState(true);

  // Pièce justificative obligatoire
  const [verificationDocUrl, setVerificationDocUrl] = useState<string | null>(null);
  const [verificationDocName, setVerificationDocName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo de profil & Cachet / Signature du médecin
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [stampName, setStampName] = useState<string | null>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

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

  // Upload Photo de Profil (Firebase Storage avec compression)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarName(file.name);
    try {
      const url = await uploadMedia(file, `doctor_avatars/${Date.now()}_${file.name}`);
      setAvatarUrl(url);
    } catch (err) {
      console.warn('Erreur upload photo de profil:', err);
    }
  };

  // Upload Cachet & Signature (Firebase Storage avec compression)
  const handleStampChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStampName(file.name);
    try {
      const url = await uploadMedia(file, `doctor_stamps/${Date.now()}_${file.name}`);
      setStampUrl(url);
    } catch (err) {
      console.warn('Erreur upload cachet médical:', err);
    }
  };

  // Compresseur d'image et upload média via storageService
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerificationDocName(file.name);
    try {
      const url = await uploadMedia(file, `doctor_verification/${Date.now()}_${file.name}`);
      setVerificationDocUrl(url);
    } catch (err) {
      console.warn('Erreur de traitement image justificatif:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError('Veuillez renseigner votre Nom et Prénom.');
      return;
    }

    if (isRegisteredOnms && !formData.onmsNumber.trim()) {
      setError('Veuillez renseigner votre numéro d’inscription ONMS ou cocher « Non encore inscrit ».');
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

    // Validation stricte de la pièce justificative
    if (!verificationDocUrl) {
      setError(
        isRegisteredOnms
          ? 'La photo de votre Carte d’inscription à l’Ordre (ONMS) est obligatoire pour valider votre dossier.'
          : 'La photo de votre Pièce d’Identité officielle (CNI / Passeport) est obligatoire pour valider votre dossier.'
      );
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
          onmsStatus: isRegisteredOnms ? 'registered' : 'unregistered',
          onmsNumber: isRegisteredOnms ? formData.onmsNumber.toUpperCase() : undefined,
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
          avatarUrl: avatarUrl || undefined,
          signatureStampUrl: stampUrl || undefined,
          verificationDocumentUrl: verificationDocUrl,
          verificationDocumentType: isRegisteredOnms ? 'onms_card' : 'id_card',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto font-sans">
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
            Adhésion Praticien TéléMed
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Rejoignez TELEMED SENEGAL
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Plateforme médicale sécurisée pour les médecins inscrits à l'Ordre ou diplômés d'État.
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
          {/* Situation Ordinale Toggle */}
          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-bold text-[#0F172A]">
              Situation au tableau de l'Ordre des Médecins (ONMS) :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsRegisteredOnms(true)}
                className={`p-3 rounded-[16px] text-xs font-bold flex items-center justify-between border transition-all ${
                  isRegisteredOnms
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Inscrit à l'Ordre (ONMS)</span>
                {isRegisteredOnms && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsRegisteredOnms(false)}
                className={`p-3 rounded-[16px] text-xs font-bold flex items-center justify-between border transition-all ${
                  !isRegisteredOnms
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Je ne suis pas encore inscrit</span>
                {!isRegisteredOnms && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

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
            {isRegisteredOnms ? (
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
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Statut Ordinal
                </label>
                <div className="px-4 py-2.5 rounded-[20px] bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                  Praticien Diplômé d'État (Non inscrit ONMS)
                </div>
              </div>
            )}

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

          {/* Upload Obligatoire du Justificatif */}
          <div className="p-4 rounded-[24px] bg-blue-50/50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#3B82F6]" />
                {isRegisteredOnms 
                  ? 'Photo de la Carte de l’Ordre (ONMS) * (Obligatoire)' 
                  : 'Photo de la Pièce d’Identité (CNI / Passeport) * (Obligatoire)'}
              </label>
              <Badge variant={verificationDocUrl ? 'emerald' : 'amber'} size="sm">
                {verificationDocUrl ? 'Document chargé' : 'Requis'}
              </Badge>
            </div>

            <p className="text-[11px] text-slate-500">
              {isRegisteredOnms
                ? 'Veuillez téléverser une photo nette de votre carte professionnelle ONMS pour vérification par la direction médicale.'
                : 'Veuillez téléverser une photo nette de votre carte d’identité nationale ou passeport en cours de validité.'}
            </p>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {verificationDocUrl ? (
              <div className="relative rounded-[16px] overflow-hidden border border-blue-200 bg-white p-2 flex items-center gap-3">
                <img
                  src={verificationDocUrl}
                  alt="Justificatif"
                  className="w-16 h-16 object-cover rounded-[12px] border border-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#0F172A] truncate">
                    {verificationDocName || 'Justificatif_Medical.jpg'}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Image prête pour transmission
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                >
                  Changer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-4 rounded-[20px] border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white/80 hover:bg-white text-blue-600 font-semibold flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm group"
              >
                <UploadCloud className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">
                  Prendre une photo ou importer le fichier
                </span>
                <span className="text-[10px] text-slate-400">
                  Formats acceptés : JPG, PNG, WEBP (Appareil photo supporté)
                </span>
              </button>
            )}
          </div>

          {/* Upload Optionnel Photo de Profil & Cachet Médical */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Photo de profil */}
            <div className="p-4 rounded-[24px] bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#3B82F6]" />
                  Photo de Profil Praticien
                </label>
                <Badge variant={avatarUrl ? 'emerald' : 'blue'} size="sm">
                  {avatarUrl ? 'Photo intégrée' : 'Recommandé'}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Incrustée dans votre QR Code et sur votre cabinet numérique.
              </p>
              <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarUrl ? (
                <div className="flex items-center gap-3 bg-white p-2 rounded-[16px] border border-slate-200">
                  <img
                    src={avatarUrl}
                    alt="Profil"
                    className="w-12 h-12 rounded-full object-cover border border-[#3B82F6]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#0F172A] truncate">Photo enregistrée</p>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Intégrée au QR Code
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-[16px] border border-dashed border-slate-300 hover:border-blue-400 bg-white text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Camera className="w-4 h-4 text-[#3B82F6]" />
                  <span>Importer ma photo</span>
                </button>
              )}
            </div>

            {/* 2. Cachet & Signature */}
            <div className="p-4 rounded-[24px] bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Cachet & Signature
                </label>
                <Badge variant={stampUrl ? 'emerald' : 'blue'} size="sm">
                  {stampUrl ? 'Cachet scellé' : 'Recommandé'}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500">
                Incrusté automatiquement sur vos ordonnances certifiées.
              </p>
              <input
                type="file"
                accept="image/*"
                ref={stampInputRef}
                onChange={handleStampChange}
                className="hidden"
              />
              {stampUrl ? (
                <div className="flex items-center gap-3 bg-white p-2 rounded-[16px] border border-slate-200">
                  <img
                    src={stampUrl}
                    alt="Cachet"
                    className="h-12 w-16 object-contain rounded-[8px] border border-slate-100 bg-slate-50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#0F172A] truncate">Tampon scellé</p>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ordonnances officielles
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => stampInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-[16px] border border-dashed border-slate-300 hover:border-emerald-400 bg-white text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  <span>Importer mon cachet</span>
                </button>
              )}
            </div>
          </div>

          {/* Note sur la validation Super-Admin */}
          <div className="p-3.5 bg-slate-100/80 rounded-[20px] border border-slate-200 text-[11px] text-[#1E293B] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#0F172A]">Validation du Dr Thiam :</span> Votre dossier sera vérifié sous 24h et votre compte bénéficiera de <strong>90 jours d’accès gratuit</strong> avec licence certifiée.
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
