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
  MessageCircle,
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
  Settings,
  ArrowUpRight,
} from 'lucide-react';
import { DoctorProfileModal } from './DoctorProfileModal';
import { getDoctorInviteWhatsAppUrl } from '@/lib/utils/whatsappHelper';
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
import { PatientQueueItem, DoctorProfile } from '@/lib/types/doctor';
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
  const [activeConsultation, setActiveConsultation] = useState<PatientQueueItem | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDirectPrescription, setShowDirectPrescription] = useState(false);
  const [origin, setOrigin] = useState('');
  const [newPaymentAlert, setNewPaymentAlert] = useState<PatientQueueItem | null>(null);

  // Gestion du mode silencieux / alertes sonores
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    setIsAudioMuted(isSoundMuted());
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
    getDoctorArchive(doctorSlug).then(arch => setArchive(arch));
    loadDirectPrescriptions();

    const unsub = listenToDoctorQueue(doctorSlug, items => {
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

  // Fallback Doctor Profile typé strictement
  const doctorData: DoctorProfile = doctorProfile || {
    id: 'dr-elhadji-pathe-thiam',
    fullName: 'Dr. Elhadji Pathé THIAM',
    speciality: 'Médecine Générale',
    clinicName: 'Cabinet Privé',
    city: 'Dakar',
    phone: '+221 78 106 92 98',
    email: 'contact@telemed.sn',
    slug: doctorSlug,
    nin: '123456789',
    status: 'active',
    createdAt: new Date().toISOString(),
    consultationFee: 5000,
    availableForTeleconsult: true,
  };

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

  const followUpCount = archive.filter(item => getFollowUpStatus(item).inFollowUp).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* 1. TOP HEADER ÉPURÉ & PROFESSIONNEL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/85 backdrop-blur-md p-5 rounded-[28px] border border-slate-200/80 shadow-sm">
        {/* Identité Médecin */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setShowProfileModal(true)}
            className="relative cursor-pointer group flex-shrink-0"
            title="Modifier mon profil et mon cachet"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-blue-600 bg-blue-50 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              {doctorProfile?.avatarUrl ? (
                <img src={doctorProfile.avatarUrl} alt={doctorProfile.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-blue-600" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 p-1 bg-blue-600 text-white rounded-full shadow-sm">
              <Sliders className="w-2.5 h-2.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {doctorProfile?.fullName || 'Dr. Elhadji Pathé THIAM'}
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

              {/* Statut Licence */}
              {licenseCheck.isValid ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Licence Active (J-{licenseCheck.daysRemaining})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Licence Échue</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              {doctorProfile?.speciality || 'Médecine Générale'} • {doctorProfile?.clinicName || 'Cabinet Privé'} ({doctorProfile?.city || 'Sénégal'})
            </p>
          </div>
        </div>

        {/* Actions Principales de l'en-tête */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Action Primaire : Ordonnance Directe */}
          <button
            type="button"
            onClick={() => setShowDirectPrescription(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Rédiger une Ordonnance</span>
          </button>

          {/* Action Secondaire : Profil & Cachet */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Modifier mon profil, spécialité et cachet médical"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Mon Profil</span>
          </button>

          {/* Action Secondaire : Silence / Audio */}
          <button
            type="button"
            onClick={handleToggleAudioMute}
            className={`px-3 py-2.5 rounded-2xl border transition-all text-xs flex items-center gap-1.5 font-semibold cursor-pointer ${
              isAudioMuted
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isAudioMuted ? 'Activer les alertes sonores' : 'Couper le son (Mode silencieux)'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span className="hidden sm:inline">{isAudioMuted ? 'Muet' : 'Son'}</span>
          </button>

          {/* Lien direct Salle Patient */}
          <Link href={`/dr/${doctorSlug}`} target="_blank" className="flex-shrink-0">
            <button
              type="button"
              className="px-3.5 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200/60"
              title="Tester ma salle de soin en vue patient"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Vue Patient</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Bannière d'alerte licence si expirée */}
      {!licenseCheck.isValid && (
        <div className="p-4 rounded-[24px] bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <span className="font-extrabold text-sm block">⚠️ Licence d'exercice échue</span>
            <p className="text-rose-700 leading-relaxed">
              Votre licence a expiré. Pour régulariser votre compte, contactez la Direction Médicale au <strong>+221 78 106 92 98</strong>.
            </p>
          </div>
          <a
            href="https://wa.me/221781069298?text=Bonjour%20Dr%20Thiam,%20je%20souhaite%20renouveler%20ma%20licence%20TELEMED%20SENEGAL"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <GlassButton size="sm" variant="danger" className="text-xs">
              Contacter (+221 78 106 92 98)
            </GlassButton>
          </a>
        </div>
      )}

      {/* Bannière flottante d'alerte de paiement déclaré */}
      {newPaymentAlert && (
        <GlassCard
          variant="floating"
          className="p-4 sm:p-5 bg-white/95 backdrop-blur-2xl border border-blue-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0 animate-pulse">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm">
                  Paiement Direct Signalé
                </Badge>
                <span className="text-xs font-medium text-slate-500">{newPaymentAlert.gender === 'F' ? 'Femme' : 'Homme'} • {newPaymentAlert.age} ans</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {newPaymentAlert.patientName} • Tél: <span className="font-mono">{newPaymentAlert.patientPhone}</span>
              </p>
              <p className="text-xs text-slate-500">
                Montant : <strong className="text-slate-900">{newPaymentAlert.amountPaid.toLocaleString('fr-FR')} FCFA</strong> via <strong>{newPaymentAlert.paymentMethod.toUpperCase()}</strong>
              </p>
            </div>
          </div>

          <GlassButton
            variant="success"
            size="md"
            className="w-full sm:w-auto shadow-sm font-bold text-xs"
            onClick={() => handleConfirmPayment(newPaymentAlert.id)}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmer la réception
          </GlassButton>
        </GlassCard>
      )}

      {/* 2. BANDEAU COMPACT : KIT D'ACCÈS PATIENT & PARTAGE RAPIDE */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Lien direct d'accès pour vos patients</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Salle Ouverte
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate font-mono mt-0.5 select-all">
              {patientLink}
            </p>
          </div>
        </div>

        {/* Boutons d'actions rapides de partage */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
          <button
            type="button"
            onClick={copyToClipboard}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Lien copié !' : 'Copier'}</span>
          </button>

          <a
            href={`https://wa.me/?text=Bonjour,%20vous%20pouvez%20rejoindre%20ma%20consultation%20médicale%20en%20ligne%20sur%20TéléMed%20Sénégal%20ici%20:%20${encodeURIComponent(patientLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          </a>

          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Afficher le QR Code du cabinet"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            <span>QR Code</span>
          </button>
        </div>
      </div>

      {/* 3. BARRE D'INDICATEURS RAPIDES & VUE DU CABINET */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            Espace Praticien
          </span>

          <a href="#salle-attente" className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-blue-200/60">
            <Users className="w-3.5 h-3.5" />
            <span>Salle d'Attente</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-extrabold">{queue.length}</span>
          </a>

          <a href="#suivis-dossiers" className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1.5 border border-amber-200/60">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Suivis 24h & Dossiers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-extrabold">{archive.length}</span>
            {followUpCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </a>

          <a href="#ordonnances-emises" className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-emerald-200/60">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ordonnances</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">{directPrescriptions.length}</span>
          </a>

          <a href="#tarifs-coordonnees" className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200">
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Tarifs & Numéros</span>
          </a>
        </div>
      </div>

      {/* 4. NIVEAU SUPÉRIEUR : SALLE D'ATTENTE & SUIVIS 24H / DOSSIERS MÉDICAUX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SECTION 1 : SALLE D'ATTENTE (EN DIRECT) */}
        <div id="salle-attente" className="scroll-mt-6">
          <GlassCard className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      Salle d'Attente
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                        {queue.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Patients en attente de téléconsultation
                    </p>
                  </div>
                </div>
              </div>

              {queue.length === 0 ? (
                <div className="py-12 text-center rounded-[20px] bg-slate-50/70 border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Aucun patient en attente</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Partagez votre lien cabinet pour recevoir vos demandes de consultation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {queue.map(patient => (
                    <div
                      key={patient.id}
                      className={`p-4 rounded-[20px] border transition-all space-y-2.5 ${
                        patient.paymentDeclared && !patient.paymentConfirmedByDoctor
                          ? 'bg-amber-50/50 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
                          : patient.paymentConfirmedByDoctor
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-slate-200/90 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {patient.patientName}
                            </h4>
                            <Badge variant="blue" size="sm">
                              {patient.gender === 'F' ? 'Femme' : 'Homme'} • {patient.age} ans
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-mono font-semibold text-slate-700">{patient.patientPhone}</span>
                            <span>•</span>
                            <span className="capitalize">{patient.urgency}</span>
                          </div>
                        </div>

                        <Badge variant="sky" size="sm">
                          <span className="flex items-center gap-1 text-[10px]">
                            <MessageSquare className="w-3 h-3" /> Téléconsult
                          </span>
                        </Badge>
                      </div>

                      <div className="p-2.5 rounded-[14px] bg-slate-50 border border-slate-100 text-xs text-slate-800">
                        <span className="text-slate-400 text-[10px] block font-medium">Motif déclaré :</span>
                        {patient.reason}
                      </div>

                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Paiement déclaré :</span>
                          <strong className="text-slate-900 font-extrabold text-xs">
                            {patient.amountPaid.toLocaleString('fr-FR')} FCFA
                          </strong>{' '}
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            via {patient.paymentMethod}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {patient.patientPhone && (
                            <a
                              href={getDoctorInviteWhatsAppUrl({
                                patientPhone: patient.patientPhone,
                                doctorName: doctorData.fullName,
                                patientName: patient.patientName,
                                consultationUrl: typeof window !== 'undefined' ? `${window.location.origin}/dr/${doctorSlug}?session=${patient.id}` : `https://telemed.sn/dr/${doctorSlug}?session=${patient.id}`,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Avertir sur WhatsApp"
                            >
                              <button
                                type="button"
                                className="p-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            </a>
                          )}

                          {!patient.paymentConfirmedByDoctor && (
                            <button
                              type="button"
                              onClick={() => handleConfirmPayment(patient.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valider Paiement</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (!licenseCheck.isValid) {
                                alert("Votre licence a expiré. Pour régulariser votre situation, veuillez contacter la Direction Générale au +221 78 106 92 98.");
                                return;
                              }
                              setActiveConsultation(patient);
                            }}
                            disabled={!licenseCheck.isValid}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                              patient.paymentConfirmedByDoctor
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${!licenseCheck.isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Ouvrir la Salle</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* SECTION 2 : SUIVIS 24H & DOSSIERS MÉDICAUX */}
        <div id="suivis-dossiers" className="scroll-mt-6">
          {(() => {
            const followUpItems = archive.filter(item => getFollowUpStatus(item).inFollowUp);
            const closedItems = archive.filter(item => !getFollowUpStatus(item).inFollowUp);

            return (
              <GlassCard className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                          Suivis 24h & Dossiers
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                            {archive.length}
                          </span>
                        </h2>
                        <p className="text-xs text-slate-500">
                          Suivis actifs (délai de grâce 24h) et dossiers clôturés
                        </p>
                      </div>
                    </div>

                    {followUpItems.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>{followUpItems.length} en cours</span>
                      </span>
                    )}
                  </div>

                  {archive.length === 0 ? (
                    <div className="py-12 text-center rounded-[20px] bg-slate-50/70 border border-dashed border-slate-200">
                      <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Aucun dossier archivé</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Les consultations terminées apparaîtront ici avec leur suivi 24h et leur signature SHA-256.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                      {/* Suivis 24h Actifs */}
                      {followUpItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Suivis Post-Consultation (24h)</span>
                          </div>

                          <div className="space-y-2.5">
                            {followUpItems.map(item => {
                              const status = getFollowUpStatus(item);
                              return (
                                <div
                                  key={item.id}
                                  className={`p-3.5 rounded-[18px] border transition-all space-y-2 ${
                                    item.hasUnreadFollowUp
                                      ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
                                      : 'bg-white border-slate-200/90 shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-slate-900 text-sm">{item.patientName}</h4>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                                          Reste {status.remainingHours}h
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                                        <span className="font-medium text-slate-900">Motif :</span> {item.reason}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setActiveConsultation(item)}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm cursor-pointer flex-shrink-0"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span>Suivi</span>
                                    </button>
                                  </div>

                                  {item.hasUnreadFollowUp && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                                      Nouveau message du patient
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Archives Définitives */}
                      {closedItems.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Dossiers Clôturés Définitivement</span>
                          </div>

                          <div className="space-y-2">
                            {closedItems.map(item => (
                              <div
                                key={item.id}
                                className="p-3 rounded-[16px] bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-900 text-xs truncate">{item.patientName}</h4>
                                    <span className="text-[10px] text-slate-400">{item.age} ans</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">{item.reason}</p>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setActiveConsultation(item)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    Voir
                                  </button>

                                  {item.prescription && (
                                    <Link href={`/verify/${item.prescription.hash}`} target="_blank">
                                      <button
                                        type="button"
                                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                        title="Vérifier la preuve SHA-256"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      </button>
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
                </div>
              </GlassCard>
            );
          })()}
        </div>
      </div>

      {/* 5. NIVEAU INFÉRIEUR (JUSTE EN BAS) : ORDONNANCES ÉMISES & TARIFS / COORDONNÉES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SECTION 3 : ORDONNANCES DIRECTES ÉMISES */}
        <div id="ordonnances-emises" className="scroll-mt-6">
          <GlassCard className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      Ordonnances Émises
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                        {directPrescriptions.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ordonnances signées et scellées (QR Code & SHA-256)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDirectPrescription(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer flex-shrink-0"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>Rédiger</span>
                </button>
              </div>

              {directPrescriptions.length === 0 ? (
                <div className="py-12 text-center rounded-[20px] bg-slate-50/70 border border-dashed border-slate-200 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucune ordonnance émise</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Rédigez et transmettez instantanément des ordonnances certifiées par WhatsApp ou en PDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {directPrescriptions.map(rx => (
                    <div
                      key={rx.id}
                      className="p-4 rounded-[20px] bg-white border border-slate-200/90 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{rx.patientName}</h4>
                            <Badge variant="emerald" size="sm">
                              Scellée
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Tél : <span className="font-mono font-semibold text-slate-700">{rx.patientPhone || 'Non renseigné'}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {new Date(rx.sealedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-[14px] bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <span className="text-slate-400 text-[10px] block font-bold uppercase tracking-wider">
                          Prescription ({rx.items.length} médicament{rx.items.length > 1 ? 's' : ''}) :
                        </span>
                        <ul className="space-y-0.5 text-slate-700 text-[11px]">
                          {rx.items.slice(0, 2).map((it, idx) => (
                            <li key={idx} className="truncate">
                              • <strong className="text-slate-900">{it.medication}</strong> ({it.dosage})
                            </li>
                          ))}
                          {rx.items.length > 2 && (
                            <li className="text-slate-400 italic text-[10px]">
                              + {rx.items.length - 2} autre(s) médicament(s)...
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                          <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{rx.hash.substring(0, 8)}...</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadPrescriptionPDF(rx)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Télécharger le PDF officiel"
                          >
                            <Download className="w-3 h-3 text-blue-600" />
                            <span>PDF</span>
                          </button>

                          <Link href={`/verify/${rx.hash}`} target="_blank">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Preuve</span>
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* SECTION 4 : TARIFS & COORDONNÉES WAVE / ORANGE MONEY */}
        <div id="tarifs-coordonnees" className="scroll-mt-6">
          <GlassCard className="p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Tarifs & Coordonnées
                    </h2>
                    <p className="text-xs text-slate-500">
                      Honoraires de téléconsultation et réceptions Wave / OM
                    </p>
                  </div>
                </div>

                {pricesSaved && (
                  <Badge variant="emerald" size="sm" className="animate-fade-in text-[10px]">
                    <Check className="w-3 h-3" /> Enregistré !
                  </Badge>
                )}
              </div>

              <form onSubmit={handleSaveServices} className="space-y-4 text-xs">
                {/* Formule de Téléconsultation */}
                <div className="p-4 rounded-[18px] bg-slate-50/80 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      Téléconsultation Médicale Complète
                    </span>
                    <Badge variant="emerald" size="sm">
                      Tarif Patient
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Montant fixe affiché à vos patients avant le paiement.
                  </p>
                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Honoraires fixés (FCFA) :
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={consultationFee}
                      onChange={e => setConsultationFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Numéros Wave et Orange Money */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-[18px] bg-white border border-slate-200/90 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-700">
                      Numéro Wave de Réception :
                    </label>
                    <input
                      type="tel"
                      value={waveNum}
                      onChange={e => setWaveNum(e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="text-[9px] text-slate-400">
                      Communiqué aux patients choisissant Wave.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[18px] bg-white border border-slate-200/90 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-700">
                      Numéro Orange Money :
                    </label>
                    <input
                      type="tel"
                      value={omNum}
                      onChange={e => setOmNum(e.target.value)}
                      placeholder="+221 78 000 00 00"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="text-[9px] text-slate-400">
                      Communiqué aux patients choisissant Orange Money.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingPrices}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingPrices ? 'Enregistrement...' : 'Enregistrer Tarifs & Numéros'}</span>
                  </button>
                </div>
              </form>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* MODALE 1 : Modale Salle de Soin Active */}
      {activeConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl h-[94vh] max-h-[900px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-scale-up">
            <LiveConsultationRoom
              patient={activeConsultation}
              doctor={doctorData}
              onClose={() => {
                setActiveConsultation(null);
                getDoctorArchive(doctorSlug).then(arch => setArchive(arch));
              }}
            />
          </div>
        </div>
      )}

      {/* MODALE 2 : Tiroir de Rédaction d'Ordonnance Directe */}
      {showDirectPrescription && (
        <PrescriptionDrawer
          doctor={doctorData}
          onClose={() => setShowDirectPrescription(false)}
          onPrescriptionSealed={(rx: OfficialPrescription) => {
            setDirectPrescriptions(prev => [rx, ...prev]);
            setShowDirectPrescription(false);
          }}
        />
      )}

      {/* MODALE 3 : Modale Profil & Cachet */}
      {showProfileModal && (
        <DoctorProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            refreshProfile();
          }}
        />
      )}

      {/* MODALE 4 : Modale QR Code */}
      {showQRModal && (
        <QRCodeModal
          url={patientLink}
          doctorName={doctorData.fullName}
          speciality={doctorData.speciality}
          onmsNumber={doctorData.onmsNumber || 'Praticien Diplômé d\'État'}
          slug={doctorSlug}
          avatarUrl={doctorData.avatarUrl}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
