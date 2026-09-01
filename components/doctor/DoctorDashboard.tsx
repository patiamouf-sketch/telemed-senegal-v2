'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { QRCodeModal } from '../ui/QRCodeModal';
import { LiveConsultationRoom } from './LiveConsultationRoom';
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
  User
} from 'lucide-react';
import { DoctorProfileModal } from './DoctorProfileModal';
import {
  getDoctorQueue,
  addPatientToQueue,
  confirmPatientPayment,
  updateDoctorProfile,
  getDoctorArchive,
  listenToDoctorQueue
} from '@/lib/services/doctorService';
import { PatientQueueItem } from '@/lib/types/doctor';
import { differenceInDays } from 'date-fns';
import { playMedicalChime } from '@/lib/utils/soundAlert';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export function DoctorDashboard() {
  const { doctorProfile, refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [queue, setQueue] = useState<PatientQueueItem[]>([]);
  const [archive, setArchive] = useState<PatientQueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'archive'>('queue');
  const [activeConsultation, setActiveConsultation] = useState<PatientQueueItem | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [origin, setOrigin] = useState('');
  const [newPaymentAlert, setNewPaymentAlert] = useState<PatientQueueItem | null>(null);

  // Pricing & service settings state
  const [avisFee, setAvisFee] = useState<number>(doctorProfile?.avisMedicalFee || 3000);
  const [visioFee, setVisioFee] = useState<number>(doctorProfile?.visioConsultationFee || 7000);
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
      setAvisFee(doctorProfile.avisMedicalFee || 3000);
      setVisioFee(doctorProfile.visioConsultationFee || 7000);
      setWaveNum(doctorProfile.waveNumber || doctorProfile.phone || '+221 77 654 32 10');
      setOmNum(doctorProfile.omNumber || doctorProfile.phone || '+221 78 654 32 10');
    }
  }, [doctorProfile]);

  const doctorSlug = doctorProfile?.slug || 'dr-sow';
  const patientLink = `${origin || 'https://telemed.sn'}/dr/${doctorSlug}`;

  // Écouteur temps réel de la file d'attente et détection immédiate des paiements
  useEffect(() => {
    // Chargement initial des archives
    getDoctorArchive(doctorSlug).then(arch => setArchive(arch));

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
  }, [doctorSlug]);

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
      avisMedicalFee: Number(avisFee) || 3000,
      visioConsultationFee: Number(visioFee) || 7000,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prestation 1: Avis Médical */}
              <div className="p-4 rounded-[24px] bg-white border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] flex items-center gap-1.5 text-sm">
                    <MessageSquare className="w-4 h-4 text-[#3B82F6]" />
                    Avis Médical
                  </span>
                  <Badge variant="sky" size="sm">
                    Messagerie/Audio
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Conseil médical succinct, orientation ou renouvellement.
                </p>
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tarif fixé (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={avisFee}
                    onChange={e => setAvisFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-slate-50 border border-slate-200/70 text-[#0F172A] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Prestation 2: Visio Consultation */}
              <div className="p-4 rounded-[24px] bg-white border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] flex items-center gap-1.5 text-sm">
                    <Video className="w-4 h-4 text-teal-600" />
                    Visio Consultation
                  </span>
                  <Badge variant="emerald" size="sm">
                    Vidéo HD
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Examen clinique visuel, interrogatoire complet et ordonnance.
                </p>
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tarif fixé (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="2000"
                    step="500"
                    value={visioFee}
                    onChange={e => setVisioFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-[18px] bg-slate-50 border border-slate-200/70 text-[#0F172A] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
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

      {/* Row 2: Tabs (File d'Attente vs Consultations Archivées) */}
      <div className="flex items-center gap-2 border-b border-sky-100/60 pb-3">
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
          onClick={() => setActiveTab('archive')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'archive'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white/70 text-slate-600 hover:bg-white'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Consultations Archivées & Ordonnances ({archive.length})
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
                      variant={patient.serviceType === 'visio_consultation' ? 'sky' : 'emerald'}
                      size="sm"
                    >
                      {patient.serviceType === 'visio_consultation' ? (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" /> Visio
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Avis
                        </span>
                      )}
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

      {/* View 2: Archived Sessions & Sealed Prescriptions */}
      {activeTab === 'archive' && (
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold shadow-sm">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">
                  Consultations Archivées ({archive.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Historique médical, horodatages et ordonnances scellées par signature SHA-256.
                </p>
              </div>
            </div>
          </div>

          {archive.length === 0 ? (
            <div className="py-12 text-center rounded-[28px] bg-white/60 border border-dashed border-slate-200">
              <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0F172A]">Aucune consultation archivée</p>
              <p className="text-xs text-slate-500 mt-1">
                Les consultations terminées apparaîtront ici avec leur preuve cryptographique.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {archive.map(item => (
                <div
                  key={item.id}
                  className="p-5 rounded-[28px] bg-white border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#0F172A] text-base">{item.patientName}</h4>
                      <Badge variant="blue" size="sm">
                        NIN: {item.patientNin}
                      </Badge>
                      <Badge variant="slate" size="sm">
                        {item.gender === 'F' ? 'Femme' : 'Homme'} • {item.age} ans
                      </Badge>
                      <Badge variant={item.serviceType === 'visio_consultation' ? 'sky' : 'emerald'} size="sm">
                        {item.serviceType === 'visio_consultation' ? 'Visio' : 'Avis'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500">{item.reason}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>Clôturé le {new Date(item.completedAt || item.joinedAt).toLocaleDateString('fr-FR')} à {new Date(item.completedAt || item.joinedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <strong className="text-slate-700">{item.amountPaid.toLocaleString('fr-FR')} FCFA ({item.paymentMethod.toUpperCase()})</strong>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/consultation/${item.id}`}>
                      <GlassButton size="sm" variant="secondary" className="text-xs">
                        Revoir Dossier
                      </GlassButton>
                    </Link>

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
          )}
        </GlassCard>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          doctorName={doctorProfile?.fullName || 'Dr. Ibrahima Sow'}
          speciality={doctorProfile?.speciality || 'Cardiologie'}
          onmsNumber={doctorProfile?.onmsNumber || 'SN-ONMS-4829'}
          slug={doctorSlug}
          url={patientLink}
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
    </div>
  );
}
