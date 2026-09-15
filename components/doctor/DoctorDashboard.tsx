'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { QRCodeModal } from '../ui/QRCodeModal';
import { LiveConsultationRoom } from './LiveConsultationRoom';
import { PrescriptionDrawer } from './PrescriptionDrawer';
import {
  Stethoscope,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Users,
  Video,
  CreditCard,
  Clock,
  ShieldCheck,
  Phone,
  Sparkles,
  Share2,
  FileText,
  QrCode,
  CheckCircle2,
  Save,
  MessageSquare,
  BellRing,
  Plus,
  Archive,
  Calendar,
  Lock,
  Sliders,
  User,
  FilePlus2,
  Volume2,
  VolumeX,
  Printer,
  Download,
} from 'lucide-react';
import { DoctorProfileModal } from './DoctorProfileModal';
import {
  getDoctorQueue,
  addPatientToQueue,
  confirmPatientPayment,
  updateDoctorProfile,
  getDoctorArchive,
  listenToDoctorQueue,
  getFollowUpStatus,
  getDoctorDirectPrescriptions,
} from '@/lib/services/doctorService';
import { PatientQueueItem } from '@/lib/types/doctor';
import { OfficialPrescription } from '@/lib/types/prescription';
import { downloadPrescriptionPDF } from '@/lib/utils/pdfGenerator';
import { differenceInDays } from 'date-fns';
import {
  playMedicalChime,
  isSoundMuted,
  toggleSoundMuted,
  listenToSoundMuted,
} from '@/lib/utils/soundAlert';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export function DoctorDashboard() {
  const { doctorProfile, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [queue, setQueue] = useState<PatientQueueItem[]>([]);
  const [archive, setArchive] = useState<PatientQueueItem[]>([]);
  const [directPrescriptions, setDirectPrescriptions] = useState<OfficialPrescription[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'archive' | 'prescriptions'>('queue');
  const [activeConsultation, setActiveConsultation] = useState<PatientQueueItem | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDirectPrescription, setShowDirectPrescription] = useState(false);
  const [origin, setOrigin] = useState('');
  const [newPaymentAlert, setNewPaymentAlert] = useState<PatientQueueItem | null>(null);

  // Gestion du mode silencieux / alertes sonores
  const [isAudioMuted, setIsAudioMuted] = useState(isSoundMuted());

  useEffect(() => {
    const unsub = listenToSoundMuted(m => setIsAudioMuted(m));
    return () => unsub();
  }, []);

  const handleToggleAudioMute = () => {
    const next = toggleSoundMuted();
    setIsAudioMuted(next);
  };

  // Pricing & service settings state
  const [consultationFee, setConsultationFee] = useState<number>(
    doctorProfile?.consultationFee || doctorProfile?.visioConsultationFee || doctorProfile?.avisMedicalFee || 5000
  );
  const [waveNum, setWaveNum] = useState<string>(doctorProfile?.waveNumber || doctorProfile?.phone || '+221 77 654 32 10');
  const [omNum, setOmNum] = useState<string>(doctorProfile?.omNumber || doctorProfile?.phone || '+221 78 654 32 10');
  const [savingPrices, setSavingPrices] = useState(false);
  const [pricesSaved, setPricesSaved] = useState(false);

  const prevQueueLengthRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (doctorProfile) {
      setConsultationFee(
        doctorProfile.consultationFee || doctorProfile.visioConsultationFee || doctorProfile.avisMedicalFee || 5000
      );
      setWaveNum(doctorProfile.waveNumber || doctorProfile.phone || '+221 77 654 32 10');
      setOmNum(doctorProfile.omNumber || doctorProfile.phone || '+221 78 654 32 10');
    }
  }, [doctorProfile]);

  const doctorSlug = doctorProfile?.slug || 'dr-elhadji-pathe-thiam';
  const patientLink = `${origin || 'https://telemed.sn'}/dr/${doctorSlug}`;

  const loadDirectPrescriptions = useCallback(async () => {
    const docKey = doctorProfile?.id || doctorProfile?.slug || doctorSlug;
    if (docKey) {
      const list = await getDoctorDirectPrescriptions(docKey);
      setDirectPrescriptions(list);
    }
  }, [doctorProfile?.id, doctorProfile?.slug, doctorSlug]);

  // Écouteur temps réel de la file d'attente, chargement des archives et ordonnances directes
  useEffect(() => {
    // Chargement initial des archives et ordonnances directes
    getDoctorArchive(doctorSlug).then(arch => setArchive(arch));
    loadDirectPrescriptions();

    const unsub = listenToDoctorQueue(doctorSlug, items => {
      // Détection des paiements déclarés non confirmés
      const unconfirmed = items.filter(p => p.paymentDeclared && !p.paymentConfirmedByDoctor);
      if (unconfirmed.length > 0 && items.length > prevQueueLengthRef.current) {
        playMedicalChime();
        setNewPaymentAlert(unconfirmed[0]);
      }
      prevQueueLengthRef.current = items.length;
      setQueue(items);
    });

    return () => unsub();
  }, [doctorSlug, loadDirectPrescriptions]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(patientLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // License calculation
  const licenseCheck = isDoctorLicenseValid(doctorProfile);

  // Save updated services & pricing
  const handleSaveServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorProfile) return;
    setSavingPrices(true);
    await updateDoctorProfile(doctorProfile.id, {
      consultationFee: Number(consultationFee) || 5000,
      avisMedicalFee: Number(consultationFee) || 5000,
      visioConsultationFee: Number(consultationFee) || 5000,
      waveNumber: waveNum,
      omNumber: omNum,
    });
    await refreshProfile();
    setSavingPrices(false);
    setPricesSaved(true);
    setTimeout(() => setPricesSaved(false), 2500);
  };

  // Doctor confirms payment reception
  const handleConfirmPayment = async (patientId: string) => {
    const updated = await confirmPatientPayment(patientId);
    if (updated) {
      setQueue(prev => prev.map(p => (p.id === patientId ? updated : p)));
      setActiveConsultation(updated);
      setNewPaymentAlert(null);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      {/* Top Header with Breathable Layout & Discrete License Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100/60 pb-5">
        <div className="flex items-center gap-4">
          {/* Avatar cliquable */}
          <div
            onClick={() => setShowProfileModal(true)}
            className="relative cursor-pointer group flex-shrink-0"
            title="Modifier mon profil et mon cachet"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#3B82F6] bg-blue-50 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              {doctorProfile?.avatarUrl ? (
                <img src={doctorProfile.avatarUrl} alt={doctorProfile.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-[#3B82F6]" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 p-1 bg-[#3B82F6] text-white rounded-full shadow-sm">
              <Sliders className="w-2.5 h-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                {doctorProfile?.fullName || 'Dr. Ibrahima Sow'}
              </h1>
              {doctorProfile?.onmsNumber ? (
                <Badge variant="blue" size="sm">
                  ONMS : {doctorProfile.onmsNumber}
                </Badge>
              ) : (
                <Badge variant="amber" size="sm">
                  Praticien Diplômé d'État
                </Badge>
              )}

              {/* Discrete License Badge */}
              {licenseCheck.isValid ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Licence : Active (J-{licenseCheck.daysRemaining})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Licence : Expirée (Renouvellement Requis)</span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500">
              {doctorProfile?.speciality || 'Médecine Générale'} • {doctorProfile?.clinicName || 'Cabinet Privé'} ({doctorProfile?.city || 'Sénégal'})
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setShowDirectPrescription(true)}
            className="text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 shadow-sm font-bold"
          >
            <FilePlus2 className="w-4 h-4 text-emerald-600" />
            <span>Rédiger une Ordonnance Directe</span>
          </GlassButton>

          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setShowProfileModal(true)}
            className="text-slate-800 bg-white/80 hover:bg-white"
          >
            <Sliders className="w-4 h-4 text-[#3B82F6]" />
            <span>Mon Profil & Cachet</span>
          </GlassButton>

          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setShowQRModal(true)}
            className="text-blue-900 bg-white/70"
          >
            <QrCode className="w-4 h-4 text-[#3B82F6]" />
            <span>QR Code</span>
          </GlassButton>

          {/* Bouton Muet / Audio Actif */}
          <button
            type="button"
            onClick={handleToggleAudioMute}
            className={`px-3 py-2 rounded-2xl border transition-all text-xs flex items-center gap-1.5 shadow-sm font-semibold ${
              isAudioMuted
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:text-[#0F172A]'
            }`}
            title={isAudioMuted ? 'Activer les alertes sonores' : 'Couper le son (Mode silencieux)'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span>{isAudioMuted ? 'Muet' : 'Audio actif'}</span>
          </button>

          <Link href={`/dr/${doctorSlug}`} target="_blank">
            <GlassButton variant="primary" size="sm">
              <ExternalLink className="w-4 h-4" />
              <span>Ma Salle Patient</span>
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* License Expiration Banner if Expired */}
      {!licenseCheck.isValid && (
        <div className="p-4 rounded-[24px] bg-rose-50 border-2 border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="space-y-0.5">
            <span className="font-extrabold text-sm block">⚠️ Sécurité Médicale : Licence d'exercice échue</span>
            <p className="text-rose-700 leading-relaxed">
              Votre licence a expiré. Pour régulariser votre situation, veuillez contacter la Direction Générale au <strong>+221 78 106 92 98</strong>.
            </p>
          </div>
          <a
            href="https://wa.me/221781069298?text=Bonjour%20Dr%20Thiam,%20je%20souhaite%20renouveler%20ma%20licence%20TELEMED%20SENEGAL"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <GlassButton size="sm" variant="danger" className="text-xs">
              Direction Générale (+221 78 106 92 98)
            </GlassButton>
          </a>
        </div>
      )}

      {/* Floating Glassmorphic Payment Banner */}
      {newPaymentAlert && (
        <GlassCard
          variant="floating"
          className="p-4 sm:p-5 bg-white/95 backdrop-blur-2xl border border-blue-200/90 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shadow-md flex-shrink-0 animate-pulse">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">
                  Paiement Direct Signalé
                </Badge>
                <span className="text-xs font-medium text-slate-500">{newPaymentAlert.gender === 'F' ? 'Femme' : 'Homme'} • {newPaymentAlert.age} ans</span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] mt-1">
                Paiement déclaré par <span className="text-[#3B82F6] font-extrabold">{newPaymentAlert.patientName}</span>, Tél: <span className="font-mono text-slate-900 font-extrabold">{newPaymentAlert.patientPhone}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Montant : <strong className="text-[#0F172A]">{newPaymentAlert.amountPaid.toLocaleString('fr-FR')} FCFA</strong> via <strong>{newPaymentAlert.paymentMethod.toUpperCase()}</strong> • {newPaymentAlert.serviceType === 'visio_consultation' ? 'Visio HD' : 'Avis Médical'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <GlassButton
              variant="success"
              size="md"
              className="w-full sm:w-auto shadow-pill-emerald font-bold"
              onClick={() => handleConfirmPayment(newPaymentAlert.id)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmer la réception
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Row 1: Kit de Consultation & Gestion des Honoraires */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kit de Consultation (5 Cols) */}
        <GlassCard className="lg:col-span-5 p-6 sm:p-7 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-[#3B82F6]" />
                Kit de Consultation Éphémère
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Prêt à recevoir" />
            </div>

            <h2 className="text-lg font-bold text-[#0F172A]">
              Lien direct pour vos patients
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Partagez ce lien sur WhatsApp ou par SMS. Vos patients accèdent instantanément sans mot de passe.
            </p>
          </div>

          {/* Copy Box */}
          <div className="p-2.5 rounded-[24px] bg-white border border-slate-100 shadow-sm space-y-2">
            <div className="px-3 py-1.5 text-xs font-mono font-semibold text-slate-800 truncate select-all">
              {patientLink}
            </div>

            <div className="flex items-center gap-2">
              <GlassButton
                variant={copied ? 'success' : 'primary'}
                size="sm"
                onClick={copyToClipboard}
                className="w-full text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowQRModal(true)}
                className="w-auto flex-shrink-0 text-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>QR Code</span>
              </GlassButton>
            </div>
          </div>

          {/* WhatsApp Quick Share */}
          <a
            href={`https://wa.me/?text=Bonjour,%20vous%20pouvez%20rejoindre%20ma%20consultation%20médicale%20en%20ligne%20sur%20TéléMed%20Sénégal%20ici%20:%20${encodeURIComponent(patientLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <GlassButton variant="secondary" size="sm" className="w-full text-xs text-emerald-800 border-emerald-200/60 bg-emerald-50/50 hover:bg-emerald-100/60">
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transmettre par WhatsApp aux patients</span>
            </GlassButton>
          </a>
        </GlassCard>

        {/* Gestion des Honoraires & Services (7 Cols) */}
        <GlassCard className="lg:col-span-7 p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                Gestion des Honoraires & Services
              </span>
              <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
                Tarification de vos deux prestations
              </h2>
            </div>

            {pricesSaved && (
              <Badge variant="emerald" size="sm" className="animate-fade-in">
                <Check className="w-3 h-3" /> Tarifs enregistrés !
              </Badge>
            )}
          </div>

          <form onSubmit={handleSaveServices} className="space-y-4 text-xs">
            {/* Prestation Unique: Téléconsultation */}
            <div className="p-4 rounded-[24px] bg-white border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A] flex items-center gap-1.5 text-sm">
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  Téléconsultation Médicale Complète
                </span>
                <Badge variant="emerald" size="sm">
                  Audio & Photos
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Échanges interactifs par notes vocales, transmission d'images et ordonnance officielle certifiée.
              </p>
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tarif unique fixé (FCFA) :
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={consultationFee}
                  onChange={e => setConsultationFee(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-[18px] bg-slate-50 border border-slate-200/70 text-[#0F172A] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Numéros de réception Wave & OM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Numéro Wave de Réception :
                </label>
                <input
                  type="tel"
                  value={waveNum}
                  onChange={e => setWaveNum(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full px-3.5 py-2 rounded-[18px] bg-white border border-slate-200/70 text-[#0F172A] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Numéro Orange Money de Réception :
                </label>
                <input
                  type="tel"
                  value={omNum}
                  onChange={e => setOmNum(e.target.value)}
                  placeholder="+221 78 000 00 00"
                  className="w-full px-3.5 py-2 rounded-[18px] bg-white border border-slate-200/70 text-[#0F172A] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <GlassButton
                type="submit"
                variant="primary"
                size="sm"
                isLoading={savingPrices}
                className="text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer mes tarifs</span>
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </div>

      {/* Row 2: Tabs (File d'Attente vs Ordonnances Directes vs Consultations Archivées) */}
      <div className="flex items-center gap-2 border-b border-sky-100/60 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-[#3B82F6] text-white shadow-pill'
              : 'bg-white/70 text-slate-600 hover:bg-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          File d'Attente Active ({queue.length})
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'prescriptions'
              ? 'bg-emerald-600 text-white shadow-pill-emerald'
              : 'bg-white/70 text-slate-600 hover:bg-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Ordonnances Directes Émises ({directPrescriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'archive'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white/70 text-slate-600 hover:bg-white'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Consultations Archivées & Suivi ({archive.length})
        </button>
      </div>

      {/* View 1: Active Queue */}
      {activeTab === 'queue' && (
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center font-bold shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">
                    Patients en File d'Attente ({queue.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Vérifiez le <strong>paiement déclaré</strong> avant de débloquer la salle de soin.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="py-12 text-center rounded-[28px] bg-white/60 border border-dashed border-sky-200">
              <Users className="w-10 h-10 text-sky-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0F172A]">Aucun patient en attente</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Partagez votre lien public <span className="font-mono font-semibold">/dr/{doctorSlug}</span> avec vos patients.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queue.map(patient => (
                <div
                  key={patient.id}
                  className={`p-5 rounded-[28px] border transition-all duration-300 space-y-3.5 ${
                    patient.paymentDeclared && !patient.paymentConfirmedByDoctor
                      ? 'bg-amber-50/70 border-amber-200 shadow-md ring-2 ring-amber-400/20'
                      : patient.paymentConfirmedByDoctor
                      ? 'bg-emerald-50/60 border-emerald-200 shadow-sm'
                      : 'bg-white/80 border-white/60 shadow-sm'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#0F172A] text-base">
                          {patient.patientName}
                        </h4>
                        <Badge variant="blue" size="sm">
                          {patient.gender === 'F' ? 'Femme' : 'Homme'} • {patient.age} ans
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">{patient.patientPhone}</span>
                        <span>•</span>
                        <span className="capitalize">{patient.urgency}</span>
                      </div>
                    </div>

                    <Badge
                      variant="sky"
                      size="sm"
                    >
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Téléconsultation
                      </span>
                    </Badge>
                  </div>

                  {/* Reason */}
                  <div className="p-3 rounded-[20px] bg-white border border-slate-100 text-xs text-[#1E293B] shadow-sm">
                    <span className="text-slate-400 text-[11px] block mb-0.5">Motif déclaré :</span>
                    {patient.reason}
                  </div>

                  {/* Payment Status & Action Button */}
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Prestation & Tarif :</span>
                      <strong className="text-[#0F172A] font-extrabold text-sm">
                        {patient.amountPaid.toLocaleString('fr-FR')} FCFA
                      </strong>{' '}
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">
                        via {patient.paymentMethod}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
                      {!patient.paymentConfirmedByDoctor && (
                        <GlassButton
                          size="sm"
                          variant="success"
                          onClick={() => handleConfirmPayment(patient.id)}
                          className="text-xs w-full sm:w-auto shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmer Réception</span>
                        </GlassButton>
                      )}

                      <GlassButton
                        size="sm"
                        variant={patient.paymentConfirmedByDoctor ? 'primary' : 'secondary'}
                        onClick={() => {
                          if (!licenseCheck.isValid) {
                            alert("Votre licence a expiré. Pour régulariser votre situation, veuillez contacter la Direction Générale au +221 78 106 92 98.");
                            return;
                          }
                          setActiveConsultation(patient);
                        }}
                        disabled={!licenseCheck.isValid}
                        className={`text-xs w-full sm:w-auto shadow-pill ${!licenseCheck.isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {patient.serviceType === 'visio_consultation' ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                        <span>Ouvrir la Salle de Soin</span>
                      </GlassButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* View 2: Archived Sessions, Active Follow-Ups & Sealed Prescriptions */}
      {activeTab === 'archive' && (() => {
        const followUpItems = archive.filter(item => getFollowUpStatus(item).inFollowUp);
        const closedItems = archive.filter(item => !getFollowUpStatus(item).inFollowUp);

        return (
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold shadow-sm">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">
                    Dossiers Médicaux & Suivis ({archive.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Suivis actifs sous délai de grâce de 48h et archives avec signature SHA-256.
                  </p>
                </div>
              </div>

              {followUpItems.length > 0 && (
                <Badge variant="amber" size="md" className="self-start sm:self-auto font-bold">
                  {followUpItems.length} patient{followUpItems.length > 1 ? 's' : ''} en suivi actif
                </Badge>
              )}
            </div>

            {archive.length === 0 ? (
              <div className="py-12 text-center rounded-[28px] bg-white/60 border border-dashed border-slate-200">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#0F172A]">Aucune consultation archivée</p>
                <p className="text-xs text-slate-500 mt-1">
                  Les consultations terminées apparaîtront ici avec leur délai de grâce et leur preuve cryptographique.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* SECTION 1: Suivis Médicaux Actifs (48h) */}
                {followUpItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Suivis Post-Consultation en cours (Délai de grâce 48h)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {followUpItems.map(item => {
                        const status = getFollowUpStatus(item);
                        return (
                          <div
                            key={item.id}
                            className={`p-5 rounded-[28px] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              item.hasUnreadFollowUp
                                ? 'bg-gradient-to-r from-amber-50 via-white to-sky-50/70 border-amber-300 shadow-md ring-2 ring-amber-400/30'
                                : 'bg-amber-50/40 border-amber-200/70 shadow-sm'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-[#0F172A] text-base">{item.patientName}</h4>
                                <Badge variant="amber" size="sm" className="font-mono">
                                  Reste {status.remainingHours}h
                                </Badge>
                                {item.hasUnreadFollowUp && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white animate-pulse shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    Nouveau message du patient
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-600">
                                <span className="font-medium text-slate-900">Motif :</span> {item.reason}
                              </p>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                                <span className="font-mono font-semibold text-slate-700">{item.patientPhone}</span>
                                <span>•</span>
                                <span>Clôturé le {new Date(item.completedAt || item.joinedAt).toLocaleDateString('fr-FR')}</span>
                                {item.lastMessageText && (
                                  <>
                                    <span>•</span>
                                    <span className="italic text-slate-500 truncate max-w-xs">
                                      Dernier échange : {item.lastMessageText}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <GlassButton
                                size="sm"
                                variant="primary"
                                onClick={() => setActiveConsultation(item)}
                                className="text-xs shadow-pill"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Accéder au Suivi</span>
                              </GlassButton>

                              {item.prescription && (
                                <Link href={`/verify/${item.prescription.hash}`} target="_blank">
                                  <GlassButton size="sm" variant="success" className="text-xs">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Preuve SHA-256</span>
                                  </GlassButton>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION 2: Archives Clôturées Définitives */}
                {closedItems.length > 0 && (
                  <div className="space-y-3">
                    {followUpItems.length > 0 && (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Archives Clôturées Définitives (Lecture seule)</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {closedItems.map(item => (
                        <div
                          key={item.id}
                          className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-[#0F172A] text-base">{item.patientName}</h4>
                              {item.patientNin && (
                                <Badge variant="blue" size="sm">
                                  NIN: {item.patientNin}
                                </Badge>
                              )}
                              <Badge variant="slate" size="sm">
                                {item.gender === 'F' ? 'Femme' : 'Homme'} • {item.age} ans
                              </Badge>
                              <Badge variant="slate" size="sm">
                                Clôturé
                              </Badge>
                            </div>

                            <p className="text-xs text-slate-500">{item.reason}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>Clôturé le {new Date(item.completedAt || item.joinedAt).toLocaleDateString('fr-FR')}</span>
                              <span>•</span>
                              <strong className="text-slate-700">{item.amountPaid.toLocaleString('fr-FR')} FCFA ({item.paymentMethod.toUpperCase()})</strong>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <GlassButton
                              size="sm"
                              variant="secondary"
                              onClick={() => setActiveConsultation(item)}
                              className="text-xs"
                            >
                              Consulter Dossier
                            </GlassButton>

                            {item.prescription && (
                              <Link href={`/verify/${item.prescription.hash}`} target="_blank">
                                <GlassButton size="sm" variant="success" className="text-xs">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Preuve SHA-256</span>
                                </GlassButton>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        );
      })()}

      {/* View 3: Ordonnances Directes Émises */}
      {activeTab === 'prescriptions' && (
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">
                    Ordonnances Directes Émises ({directPrescriptions.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ordonnances scellées et signées numériquement avec QR Code et preuve cryptographique SHA-256.
                  </p>
                </div>
              </div>
            </div>

            <GlassButton
              variant="success"
              size="sm"
              onClick={() => setShowDirectPrescription(true)}
              className="font-bold text-xs"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Rédiger une nouvelle ordonnance</span>
            </GlassButton>
          </div>

          {directPrescriptions.length === 0 ? (
            <div className="py-12 text-center rounded-[28px] bg-white/60 border border-dashed border-slate-200 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-bold text-[#0F172A]">Aucune ordonnance directe rédigée pour le moment</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Rédigez et signez des ordonnances sécurisées hors consultation pour vos patients avec vérification officielle par QR Code.
                </p>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => setShowDirectPrescription(true)}
                className="text-xs shadow-pill"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Rédiger une ordonnance maintenant</span>
              </GlassButton>
            </div>
          ) : (
            <div className="space-y-3">
              {directPrescriptions.map(rx => (
                <div
                  key={rx.id || rx.hash}
                  className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-[#0F172A] text-base">{rx.patientName}</h4>
                      {rx.patientPhone && (
                        <Badge variant="blue" size="sm">
                          Tél : {rx.patientPhone}
                        </Badge>
                      )}
                      <Badge variant="slate" size="sm">
                        {rx.patientGender === 'F' ? 'Femme' : 'Homme'} • {rx.patientAge} ans
                      </Badge>
                      <Badge variant="emerald" size="sm">
                        SHA-256 Authentique
                      </Badge>
                    </div>

                    {/* Médicaments prescrits */}
                    <div className="text-xs text-slate-700 space-y-0.5 pt-1">
                      {rx.items?.map((it, itIdx) => (
                        <div key={itIdx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <strong className="text-slate-900">{it.medication}</strong>
                          {it.dosage && <span>— {it.dosage}</span>}
                          {it.duration && <span className="text-slate-400">({it.duration})</span>}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Émise le {new Date(rx.sealedAt).toLocaleDateString('fr-FR')} à {new Date(rx.sealedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {rx.patientAddress && (
                        <>
                          <span>•</span>
                          <span>{rx.patientAddress}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => downloadPrescriptionPDF(rx)}
                      className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#3B82F6]" />
                      <span>Télécharger PDF</span>
                    </button>

                    <Link href={`/verify-rx/${rx.hash}`} target="_blank">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Preuve SHA-256</span>
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          doctorName={doctorProfile?.fullName || 'Dr. Elhadji Pathé THIAM'}
          speciality={doctorProfile?.speciality || 'Médecine Générale'}
          onmsNumber={doctorProfile?.onmsNumber || 'SN-ONMS-OFFICIEL'}
          slug={doctorSlug}
          url={patientLink}
          avatarUrl={doctorProfile?.avatarUrl}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Doctor Profile & Stamp Modal */}
      {showProfileModal && (
        <DoctorProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Live Consultation Room (Chat or HD Video) */}
      {activeConsultation && doctorProfile && (
        <LiveConsultationRoom
          patient={activeConsultation}
          doctor={doctorProfile}
          onClose={() => {
            setActiveConsultation(null);
            getDoctorArchive(doctorSlug).then(arch => setArchive(arch));
          }}
        />
      )}

      {/* Standalone / Direct Prescription Drawer (Hors Consultation) */}
      {showDirectPrescription && (
        <PrescriptionDrawer
          doctor={doctorProfile || {
            id: 'admin-thiam-1',
            fullName: 'Dr. Elhadji Pathé THIAM',
            email: 'pati.amouf@gmail.com',
            phone: '+221 78 106 92 98',
            nin: '1985031500001',
            speciality: 'Médecine Générale',
            onmsNumber: '',
            clinicName: '',
            city: 'Dakar',
            consultationFee: 15000,
            availableForTeleconsult: true,
            slug: doctorSlug,
            status: 'active',
            role: 'admin',
            licenseExpiresAt: '2099-12-31T23:59:59.000Z',
            createdAt: new Date().toISOString(),
          }}
          patient={null}
          onClose={() => setShowDirectPrescription(false)}
          onPrescriptionSealed={() => {
            loadDirectPrescriptions();
            setActiveTab('prescriptions');
          }}
        />
      )}
    </div>
  );
}
