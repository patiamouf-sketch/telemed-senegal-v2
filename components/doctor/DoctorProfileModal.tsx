'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { DoctorProfile } from '@/lib/types/doctor';
import { updateDoctorProfile } from '@/lib/services/doctorService';
import { uploadMedia, dataUrlToBlob } from '@/lib/services/storageService';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { ImageCropperModal } from '../ui/ImageCropperModal';
import { 
  User, 
  Camera, 
  Stethoscope, 
  MapPin, 
  Phone, 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  UploadCloud, 
  Sliders, 
  Eye, 
  Image as ImageIcon, 
  Check,
  FolderOpen,
  Crop,
  RotateCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DoctorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorProfileModal({ isOpen, onClose }: DoctorProfileModalProps) {
  const { doctorProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'stamp'>('info');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState(doctorProfile?.fullName || '');
  const [speciality, setSpeciality] = useState(doctorProfile?.speciality || '');
  const [clinicName, setClinicName] = useState(doctorProfile?.clinicName || '');
  const [city, setCity] = useState(doctorProfile?.city || '');
  const [bio, setBio] = useState(doctorProfile?.bio || '');
  const [consultationFee, setConsultationFee] = useState<number | string>(
    doctorProfile?.consultationFee || doctorProfile?.visioConsultationFee || doctorProfile?.avisMedicalFee || 5000
  );
  const [waveNumber, setWaveNumber] = useState(doctorProfile?.waveNumber || doctorProfile?.phone || '');
  const [omNumber, setOmNumber] = useState(doctorProfile?.omNumber || doctorProfile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(doctorProfile?.avatarUrl);

  // Stamp & Signature Studio (Option A - White Paper Auto-Contrast Canvas & Recadrage Libre)
  const [rawStampImage, setRawStampImage] = useState<string | null>(null);
  const [processedStampUrl, setProcessedStampUrl] = useState<string | undefined>(doctorProfile?.signatureStampUrl);
  const [contrastThreshold, setContrastThreshold] = useState(195); // 0 to 255 for paper cleaning
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const stampCameraInputRef = useRef<HTMLInputElement>(null);
  const stampFileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Recadrage Libre
  const [cropperSourceImage, setCropperSourceImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  useEffect(() => {
    if (doctorProfile) {
      setFullName(doctorProfile.fullName || '');
      setSpeciality(doctorProfile.speciality || '');
      setClinicName(doctorProfile.clinicName || '');
      setCity(doctorProfile.city || '');
      setBio(doctorProfile.bio || '');
      setConsultationFee(
        doctorProfile.consultationFee || doctorProfile.visioConsultationFee || doctorProfile.avisMedicalFee || 5000
      );
      setWaveNumber(doctorProfile.waveNumber || doctorProfile.phone || '');
      setOmNumber(doctorProfile.omNumber || doctorProfile.phone || '');
      setAvatarUrl(doctorProfile.avatarUrl);
      setProcessedStampUrl(doctorProfile.signatureStampUrl);
    }
  }, [doctorProfile]);

  // Traitement d'image du cachet sur feuille blanche (Détourage transparent, Rehaussement d'encre & Format ultra-léger)
  const processStampCanvas = (imageSrc: string, threshold: number) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Taille optimisée pour tampon d'ordonnance (ultra-légère < 35 Ko)
      const maxDim = 380;
      let w = img.width;
      let h = img.height;

      if (w > h && w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else if (h > maxDim) {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Algorithme d'isolation d'encre et détourage transparent du papier blanc
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        if (brightness > threshold) {
          // Papier blanc éliminé : rendu 100% transparent pour superposition parfaite
          data[i + 3] = 0;
        } else {
          // Rehaussement du contraste de l'encre médicale (bleue, noire ou verte)
          const factor = 1.4;
          data[i] = Math.max(0, Math.min(255, (r - 90) * factor));
          data[i + 1] = Math.max(0, Math.min(255, (g - 90) * factor));
          data[i + 2] = Math.max(0, Math.min(255, (b - 90) * factor));
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const resultDataUrl = canvas.toDataURL('image/png');
      setProcessedStampUrl(resultDataUrl);

      // Téléversement asynchrone sécurisé vers storage
      try {
        const stampBlob = dataUrlToBlob(resultDataUrl);
        uploadMedia(stampBlob, `doctor_stamps/${Date.now()}_stamp.png`).catch(() => {});
      } catch {}
    };
    img.src = imageSrc;
  };

  // Sélection d'un fichier image (via caméra ou fichier)
  const handleStampFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        setCropperSourceImage(src);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Callback de validation du recadrage libre
  const handleCropComplete = (croppedDataUrl: string) => {
    setRawStampImage(croppedDataUrl);
    processStampCanvas(croppedDataUrl, contrastThreshold);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const storageUrl = await uploadMedia(file, `doctor_avatars/${Date.now()}_${file.name}`);
      setAvatarUrl(storageUrl);
    } catch (err) {
      console.warn('Avatar storage upload notice, using canvas:', err);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dim = 400;
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, dim, dim);
          const result = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(prev => prev || result);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorProfile) return;

    // Validation préalable
    if (!fullName.trim()) {
      setActiveTab('info');
      setErrorMsg('Le Nom et Prénom du praticien sont obligatoires.');
      return;
    }

    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updates: Partial<DoctorProfile> = {
        fullName: fullName.trim(),
        speciality: speciality.trim() || 'Médecine Générale',
        clinicName: clinicName.trim(),
        city: city.trim(),
        bio: bio.trim(),
        consultationFee: Number(consultationFee) || 5000,
        avisMedicalFee: Number(consultationFee) || 5000,
        visioConsultationFee: Number(consultationFee) || 5000,
        waveNumber: waveNumber.trim(),
        omNumber: omNumber.trim(),
        avatarUrl,
        signatureStampUrl: processedStampUrl,
      };

      await updateDoctorProfile(doctorProfile.id, updates);
      await refreshProfile();

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSuccessMsg('Profil et Cachet enregistrés avec succès !');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erreur lors de l’enregistrement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !doctorProfile) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-md p-3 sm:p-4 font-sans">
      <div className="min-h-full flex items-start sm:items-center justify-center py-4 sm:py-8">
        <GlassCard className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/90 p-5 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          {/* Avatar Clickable */}
          <div className="relative group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#3B82F6] bg-blue-50 flex items-center justify-center shadow-md flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={doctorProfile.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-[#3B82F6]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 bg-[#3B82F6] text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              title="Changer ma photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={avatarInputRef}
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div>
            <Badge variant="blue" size="sm" className="mb-1">
              Espace Praticien Certifié
            </Badge>
            <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
              Paramètres & Cachet Médical
            </h2>
            <p className="text-xs text-slate-500">
              Gérez votre profil public, vos honoraires et numérisez votre cachet officiel.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 ${
              activeTab === 'info'
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profil & Tarifs de Consultation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stamp')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 ${
              activeTab === 'stamp'
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Numériseur de Cachet (Feuille Blanche)
          </button>
        </div>

        {successMsg && (
          <div className="p-3 rounded-[16px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          {/* TAB 1: INFORMATIONS GENERALES & TARIFS */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Nom & Prénom Praticien
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A] focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Spécialité
                  </label>
                  <input
                    type="text"
                    required
                    value={speciality}
                    onChange={e => setSpeciality(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A] focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Cabinet / Clinique
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={e => setClinicName(e.target.value)}
                    placeholder="Ex: Cabinet Médical Almadies"
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A] focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Ville d'exercice
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Ex: Dakar"
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A] focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Tarif unique de Téléconsultation */}
              <div className="p-4 rounded-[22px] bg-blue-50/50 border border-blue-100 space-y-3">
                <h4 className="font-bold text-[#0F172A] text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                  Honoraires & Tarif de Téléconsultation (FCFA)
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tarif unique de Téléconsultation (Notes vocales, Photos, Messagerie & Ordonnance)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      placeholder="5000"
                      value={consultationFee === 0 || consultationFee === '0' ? '' : consultationFee}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setConsultationFee('');
                        } else {
                          const cleanVal = val.replace(/^0+(?=\d)/, '');
                          const parsed = parseInt(cleanVal, 10);
                          setConsultationFee(isNaN(parsed) ? '' : parsed);
                        }
                      }}
                      onBlur={() => {
                        if (!consultationFee || Number(consultationFee) <= 0) {
                          setConsultationFee(5000);
                        }
                      }}
                      className="w-full pl-3.5 pr-14 py-2.5 rounded-[16px] bg-white border border-slate-200 text-sm font-extrabold text-[#0F172A]"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">FCFA</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ce montant unique est facturé au patient pour l'ensemble des échanges audio/photo et la prescription.
                  </p>
                </div>
              </div>

              {/* Coordonnées de Paiement Wave & OM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-sky-500" /> Numéro Wave (Paiement)
                  </label>
                  <input
                    type="tel"
                    value={waveNumber}
                    onChange={e => setWaveNumber(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-orange-500" /> Numéro Orange Money
                  </label>
                  <input
                    type="tel"
                    value={omNumber}
                    onChange={e => setOmNumber(e.target.value)}
                    placeholder="+221 78 000 00 00"
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Présentation / Biographie médicale
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Présentez votre parcours et votre expertise..."
                  className="w-full px-3.5 py-2 rounded-[18px] bg-white border border-slate-200 text-xs text-[#0F172A]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: NUMERISEUR DE CACHET & SIGNATURE (OPTION A - FEUILLE BLANCHE + RECADRAGE LIBRE) */}
          {activeTab === 'stamp' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-[22px] bg-slate-50 border border-slate-200/90 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-xs sm:text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                      Numériseur & Recadreur de Cachet Médical
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Apposez votre tampon et signez sur une <strong>feuille blanche</strong>. Prenez la photo ou importez une image : recadrez librement la zone utile, l'outil élimine automatiquement les ombres du papier et optimise l'encre.
                    </p>
                  </div>

                  {/* Boutons d'acquisition : Photo directe + Import fichier */}
                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => stampCameraInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                      title="Prendre une photo avec l'appareil photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Prendre la photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => stampFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200/90 shadow-sm transition-all active:scale-95 cursor-pointer"
                      title="Importer une photo depuis vos dossiers / galerie"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Importer une image</span>
                    </button>

                    {/* Inputs cachés */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={stampCameraInputRef}
                      onChange={handleStampFileSelected}
                      className="hidden"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={stampFileInputRef}
                      onChange={handleStampFileSelected}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Bouton de Recadrage à nouveau et Slider de Contraste */}
                {rawStampImage && (
                  <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (cropperSourceImage || rawStampImage) {
                          setCropperSourceImage(cropperSourceImage || rawStampImage);
                          setIsCropperOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
                    >
                      <Crop className="w-3.5 h-3.5 text-blue-600" />
                      <span>Recadrer la photo</span>
                    </button>

                    <div className="flex-1 max-w-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-blue-600" />
                          Sensibilité fond blanc :
                        </span>
                        <span className="font-mono text-blue-600">{contrastThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="120"
                        max="240"
                        value={contrastThreshold}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setContrastThreshold(val);
                          if (rawStampImage) processStampCanvas(rawStampImage, val);
                        }}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden Canvas for computation */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Visual Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Result Preview */}
                <div className="p-4 rounded-[22px] bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[160px]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                    Aperçu sur vos Ordonnances
                  </span>
                  {processedStampUrl ? (
                    <div className="p-2 border border-slate-100 rounded-lg bg-white shadow-inner max-h-28 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={processedStampUrl}
                        alt="Cachet numérisé"
                        className="max-h-24 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 space-y-1">
                      <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>Aucun cachet numérisé pour l'instant.</p>
                      <p className="text-[10px]">Le cachet par défaut de l'ONMS sera utilisé.</p>
                    </div>
                  )}
                </div>

                {/* Guarantee Note */}
                <div className="p-4 rounded-[22px] bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-900 space-y-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <Check className="w-4 h-4" />
                    Intégration automatique
                  </div>
                  <p className="leading-relaxed">
                    Ce cachet numérisé et certifié sera directement incrusté au bas de chaque ordonnance numérique signée, accompagné du QR Code de conformité TELEMED SENEGAL.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <GlassButton type="button" variant="secondary" size="md" onClick={onClose}>
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" size="md" isLoading={loading} className="shadow-pill">
              <CheckCircle2 className="w-4 h-4" />
              Enregistrer mon Profil
            </GlassButton>
          </div>
        </form>
        </GlassCard>
      </div>

      {/* Modal de Recadrage Libre Interactif */}
      {isCropperOpen && cropperSourceImage && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          imageSrc={cropperSourceImage}
          onClose={() => setIsCropperOpen(false)}
          onCropComplete={handleCropComplete}
          title="Recadrer le Cachet & la Signature"
          subtitle="Ajustez les poignées bleues autour de votre tampon pour supprimer les bords de la feuille."
        />
      )}
    </div>
  );
}
