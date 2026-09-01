'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getDoctorBySlug, addPatientToQueue, getPatientById, sendConsultationMessage, listenToPatient } from '@/lib/services/doctorService';
import { DoctorProfile, PatientQueueItem, ServiceType, ChatMessage } from '@/lib/types/doctor';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { DemoSwitcher } from '@/components/ui/DemoSwitcher';
import {
  Stethoscope,
  ShieldCheck,
  MapPin,
  Clock,
  Video,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Activity,
  CreditCard,
  Sparkles,
  ArrowRight,
  Lock,
  MessageSquare,
  Copy,
  Check,
  Send,
  Smartphone,
  Mic,
  Image as ImageIcon,
  ExternalLink,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function PatientRoomPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Stepper state: 'form' -> 'payment' -> 'waiting' -> 'consultation'
  const [step, setStep] = useState<'form' | 'payment' | 'waiting' | 'consultation'>('form');

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientNin, setPatientNin] = useState('1989041200456');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [age, setAge] = useState('32');
  const [patientPhone, setPatientPhone] = useState('+221 ');
  const [reason, setReason] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('visio_consultation');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave');
  const [error, setError] = useState<string | null>(null);

  // Active queue session
  const [createdPatient, setCreatedPatient] = useState<PatientQueueItem | null>(null);
  const [copiedNum, setCopiedNum] = useState(false);

  // Chat in consultation room for patient
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [patientImagePreview, setPatientImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDoctor() {
      if (!slug) return;
      setLoading(true);
      const docProfile = await getDoctorBySlug(slug);
      setDoctor(docProfile);
      setLoading(false);
    }
    loadDoctor();
  }, [slug]);

  // Écouteur temps réel dès que la session patient est créée
  useEffect(() => {
    if (!createdPatient?.id) return;

    const unsub = listenToPatient(createdPatient.id, updated => {
      if (updated) {
        setCreatedPatient(updated);
        if (updated.messages) {
          setChatMessages(updated.messages);
        }
        if (updated.paymentConfirmedByDoctor && step === 'waiting') {
          setStep('consultation');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    });

    return () => unsub();
  }, [createdPatient?.id, step]);

  // Handle Form Submit -> Go to Payment Step
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError('Veuillez renseigner votre Nom et Prénom.');
      return;
    }
    if (!patientPhone || patientPhone.trim().length < 9) {
      setError('Veuillez renseigner un numéro de téléphone valide.');
      return;
    }
    if (!reason.trim()) {
      setError('Veuillez décrire le motif de votre consultation.');
      return;
    }

    setStep('payment');
  };

  // Handle "J'ai effectué le paiement"
  const handleDeclarePayment = async () => {
    setError(null);
    const amount = serviceType === 'avis_medical'
      ? (doctor?.avisMedicalFee || 3000)
      : (doctor?.visioConsultationFee || 7000);

    try {
      const item = await addPatientToQueue({
        doctorSlug: slug,
        patientName,
        patientNin: patientNin.trim() || `SN-${Date.now().toString().slice(-8)}`,
        patientPhone,
        gender,
        age: Number(age) || 30,
        serviceType,
        amountPaid: amount,
        paymentMethod,
        paymentDeclared: true,
        paymentConfirmedByDoctor: false,
        reason,
        urgency: 'normale',
      });

      setCreatedPatient(item);
      setChatMessages(item.messages || []);
      setStep('waiting');

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la déclaration du paiement.');
    }
  };

  // Handle patient sending a text message
  const handleSendPatientMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !createdPatient) return;

    const msg = await sendConsultationMessage(createdPatient.id, {
      sender: 'patient',
      type: 'text',
      text: chatInput.trim(),
    });

    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  // Handle patient uploading a medical photo
  const handlePatientImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdPatient) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const imageUrl = event.target?.result as string;
      const msg = await sendConsultationMessage(createdPatient.id, {
        sender: 'patient',
        type: 'image',
        text: `Photo / Bilan transmis par le patient (${file.name})`,
        imageUrl,
      });
      setChatMessages(prev => [...prev, msg]);
    };
    reader.readAsDataURL(file);
  };

  const copyDoctorNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center bg-white/80 max-w-sm shadow-soft-float">
          <Activity className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#0F172A]">Accès au cabinet médical...</p>
        </GlassCard>
      </div>
    );
  }

  const licenseCheck = isDoctorLicenseValid(doctor);

  if (!doctor || !licenseCheck.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center bg-white/90 max-w-md space-y-4 shadow-soft-float">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Cabinet Médical Temporairement Indisponible</h2>
          <p className="text-xs text-slate-500">
            {licenseCheck.message || 'Ce praticien n\'est pas disponible pour le moment ou est en cours de validation par la direction médicale.'}
          </p>
          <Link href="/">
            <GlassButton variant="primary" size="sm">
              Retour à l'accueil
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const avisPrice = doctor.avisMedicalFee || 3000;
  const visioPrice = doctor.visioConsultationFee || 7000;
  const selectedPrice = serviceType === 'avis_medical' ? avisPrice : visioPrice;
  const activeTransferNum = paymentMethod === 'wave'
    ? (doctor.waveNumber || doctor.phone)
    : (doctor.omNumber || doctor.phone);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Doctor Header Banner */}
        <GlassCard className="p-6 sm:p-7 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center text-xl font-extrabold shadow-lg shadow-blue-500/25 flex-shrink-0">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">{doctor.fullName}</h1>
                  <Badge variant="emerald" size="sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ONMS : {doctor.onmsNumber}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-[#3B82F6] font-bold mt-0.5">{doctor.speciality}</p>
                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  {doctor.clinicName || 'Cabinet Privé'} ({doctor.city || 'Sénégal'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="p-3 rounded-[20px] bg-white border border-slate-100 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Avis Médical</span>
                <strong className="text-[#0F172A] font-extrabold">{avisPrice.toLocaleString('fr-FR')} F</strong>
              </div>
              <div className="p-3 rounded-[20px] bg-white border border-slate-100 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Visio Consultation</span>
                <strong className="text-[#3B82F6] font-extrabold">{visioPrice.toLocaleString('fr-FR')} F</strong>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* STEP 1: Identification (Nom, Sexe, Âge, Tél) & Prestation */}
        {step === 'form' && (
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <div className="text-center max-w-md mx-auto space-y-1">
              <Badge variant="blue" size="sm">
                Étape 1 sur 3 • Entrée Sécurisée
              </Badge>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">
                Informations & Prestation
              </h2>
              <p className="text-xs text-slate-500">
                Admission médicale directe sans création de mot de passe.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleProceedToPayment} className="space-y-5 text-xs sm:text-sm">
              {/* Patient Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Nom & Prénom du Patient *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mamadou Diallo"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0F172A] mb-1.5 text-xs">Sexe *</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as 'M' | 'F')}
                      className="w-full px-3.5 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                    >
                      <option value="M">Homme</option>
                      <option value="F">Femme</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] mb-1.5 text-xs">Âge *</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      placeholder="Ex: 32"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5 text-xs">
                  <Phone className="w-3.5 h-3.5 text-[#3B82F6]" /> Numéro de Téléphone (WhatsApp / SMS) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+221 77 123 45 67"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                />
              </div>

              {/* Service Selection Cards */}
              <div>
                <label className="block font-bold text-[#0F172A] mb-2 text-xs">
                  Choisissez votre prestation médicale :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Avis Médical */}
                  <div
                    onClick={() => setServiceType('avis_medical')}
                    className={`p-5 rounded-[28px] border-2 cursor-pointer transition-all ${
                      serviceType === 'avis_medical'
                        ? 'bg-blue-50/70 border-[#3B82F6] shadow-md ring-4 ring-blue-500/10'
                        : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-[#0F172A] flex items-center gap-1.5 text-sm">
                        <MessageSquare className="w-4 h-4 text-[#3B82F6]" />
                        Avis Médical
                      </span>
                      <strong className="text-[#3B82F6] font-extrabold text-base">
                        {avisPrice.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Échange par messagerie sécurisée & notes vocales avec le Dr. {doctor.fullName.split(' ').pop()}.
                    </p>
                  </div>

                  {/* Option 2: Visio Consultation */}
                  <div
                    onClick={() => setServiceType('visio_consultation')}
                    className={`p-5 rounded-[28px] border-2 cursor-pointer transition-all ${
                      serviceType === 'visio_consultation'
                        ? 'bg-teal-50/70 border-teal-500 shadow-md ring-4 ring-teal-500/10'
                        : 'bg-white border-slate-100 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-[#0F172A] flex items-center gap-1.5 text-sm">
                        <Video className="w-4 h-4 text-teal-600" />
                        Visio Consultation
                      </span>
                      <strong className="text-teal-900 font-extrabold text-base">
                        {visioPrice.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Consultation vidéo face-à-face et ordonnance numérique scellée.
                    </p>
                  </div>
                </div>
              </div>

              {/* Consultation Reason */}
              <div>
                <label className="block font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-[#3B82F6]" /> Motif de la consultation / Symptômes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Décrivez vos symptômes actuels (fièvre, maux de tête, suivi de traitement...)"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
                />
              </div>

              <div className="pt-2">
                <GlassButton type="submit" variant="primary" size="lg" className="w-full shadow-pill">
                  <span>Continuer vers le Paiement ({selectedPrice.toLocaleString('fr-FR')} FCFA)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* STEP 2: Direct Payment Instructions */}
        {step === 'payment' && (
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <div className="text-center max-w-md mx-auto space-y-1">
              <Badge variant="amber" size="sm">
                Étape 2 sur 3 • Paiement Direct
              </Badge>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">
                Règlement des Honoraires
              </h2>
              <p className="text-xs text-slate-500">
                Effectuez votre transfert direct sur le compte Wave ou Orange Money du praticien.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setPaymentMethod('wave')}
                className={`p-4 rounded-full border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  paymentMethod === 'wave'
                    ? 'bg-[#1DA1F2]/10 border-[#1DA1F2] text-[#0c7abf] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#1DA1F2]" />
                Wave
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('orange_money')}
                className={`p-4 rounded-full border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  paymentMethod === 'orange_money'
                    ? 'bg-[#FF7900]/10 border-[#FF7900] text-[#c75d00] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#FF7900]" />
                Orange Money
              </button>
            </div>

            {/* Transfer Instructions Box */}
            <div className="p-6 rounded-[28px] bg-white border border-slate-100 text-center space-y-4 max-w-md mx-auto shadow-sm">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block">
                Montant exact à transférer
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                {selectedPrice.toLocaleString('fr-FR')} <span className="text-sm font-semibold text-slate-400">FCFA</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-[20px] border border-slate-200/60 flex items-center justify-between text-xs font-mono">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 font-sans block">
                    Numéro de réception ({paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}) :
                  </span>
                  <strong className="text-sm font-bold text-[#0F172A]">{activeTransferNum}</strong>
                </div>

                <GlassButton
                  size="sm"
                  variant={copiedNum ? 'success' : 'secondary'}
                  onClick={() => copyDoctorNumber(activeTransferNum)}
                  className="flex-shrink-0"
                >
                  {copiedNum ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNum ? 'Copié' : 'Copier'}</span>
                </GlassButton>
              </div>

              <div className="text-[11px] text-slate-500 text-left bg-blue-50/50 p-3 rounded-[16px]">
                💡 Ouvrez votre application <strong>{paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}</strong> sur votre téléphone, effectuez le transfert de <strong>{selectedPrice.toLocaleString('fr-FR')} FCFA</strong> au numéro ci-dessus, puis validez avec le bouton ci-dessous.
              </div>
            </div>

            {/* Submit Payment Declaration */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <GlassButton
                variant="secondary"
                size="md"
                onClick={() => setStep('form')}
                className="w-full sm:w-auto text-xs"
              >
                Retour
              </GlassButton>

              <GlassButton
                variant="success"
                size="lg"
                onClick={handleDeclarePayment}
                className="w-full sm:flex-1 text-sm shadow-pill-emerald"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>J'ai effectué le paiement</span>
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* STEP 3: Waiting Room */}
        {step === 'waiting' && createdPatient && (
          <GlassCard className="p-8 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-md animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <Badge variant="amber" size="md">
                Paiement déclaré • En attente de confirmation
              </Badge>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">
                Le Dr. {doctor.fullName.split(' ').pop()} vérifie la réception
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Une alerte sonore et visuelle a été transmise au médecin. Votre salle de consultation s'ouvrira automatiquement dès validation.
              </p>
            </div>

            <div className="p-4 rounded-[24px] bg-white border border-slate-100 text-left max-w-md mx-auto text-xs space-y-1.5 shadow-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient :</span>
                <strong className="text-[#0F172A]">{createdPatient.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sexe & Âge :</span>
                <span className="text-slate-800">{createdPatient.gender === 'F' ? 'Femme' : 'Homme'}, {createdPatient.age} ans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prestation :</span>
                <span className="font-bold text-[#3B82F6] capitalize">
                  {createdPatient.serviceType === 'visio_consultation' ? 'Visio Consultation' : 'Avis Médical'} ({createdPatient.amountPaid.toLocaleString('fr-FR')} FCFA)
                </span>
              </div>
            </div>

            {/* Simulation Button for Fast Evaluation */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 mb-2">Mode Démo : vous pouvez forcer l'ouverture</p>
              <GlassButton
                variant="glass"
                size="sm"
                onClick={() => {
                  setStep('consultation');
                  confetti({ particleCount: 50, spread: 60 });
                }}
                className="text-xs text-blue-900"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                Simuler validation médecin immédiate
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* STEP 4: Live Consultation (Patient Room with Chat, Audio Notes, Video, and Sealed Prescriptions) */}
        {step === 'consultation' && createdPatient && (
          <GlassCard className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  {serviceType === 'visio_consultation' ? <Video className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0F172A] text-base">
                    Consultation avec {doctor.fullName}
                  </h3>
                  <Badge variant="emerald" size="sm">
                    {serviceType === 'visio_consultation' ? 'Vidéoconsultation HD' : 'Avis Médical Direct'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Video Simulation if Visio */}
            {serviceType === 'visio_consultation' && (
              <div className="rounded-[28px] bg-slate-950 p-6 text-white text-center space-y-3 relative overflow-hidden">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-2xl font-extrabold mx-auto shadow-xl ring-4 ring-sky-400/20 animate-pulse">
                  Dr
                </div>
                <h4 className="font-bold text-lg">{doctor.fullName}</h4>
                <p className="text-xs text-sky-300">Votre médecin est connecté en direct.</p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                    Caméra & Audio Actifs
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Chat Messages */}
            <div className="rounded-[24px] bg-white border border-slate-100 p-4 h-80 overflow-y-auto space-y-3 text-xs shadow-sm">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'patient'
                      ? 'items-end'
                      : msg.sender === 'system'
                      ? 'items-center'
                      : 'items-start'
                  }`}
                >
                  {msg.sender === 'system' ? (
                    <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium my-1">
                      {msg.text}
                    </div>
                  ) : msg.prescriptionData ? (
                    /* Official Sealed Prescription Card for Patient */
                    <div className="max-w-md w-full rounded-[24px] bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-300 p-4 shadow-lg space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <strong className="text-xs text-emerald-900 uppercase">Ordonnance Médicale Scellée</strong>
                        </div>
                        <Badge variant="emerald" size="sm">
                          ONMS {doctor.onmsNumber}
                        </Badge>
                      </div>

                      <div className="bg-white/90 p-3 rounded-[16px] border border-emerald-100 space-y-1 text-xs">
                        {msg.prescriptionData.items.map((it, idx) => (
                          <div key={idx} className="text-slate-800">
                            <strong>• {it.medication}</strong> : {it.dosage} ({it.duration})
                          </div>
                        ))}
                      </div>

                      {msg.prescriptionData.dietaryAdvice && (
                        <p className="text-[11px] text-slate-600 italic">
                          Conseils : {msg.prescriptionData.dietaryAdvice}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between">
                        <a
                          href={msg.prescriptionData.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Voir & Imprimer l'Ordonnance Officielle</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-[20px] p-3.5 shadow-sm space-y-2 ${
                        msg.sender === 'patient'
                          ? 'bg-[#3B82F6] text-white rounded-br-none'
                          : 'bg-slate-100 text-[#1E293B] rounded-bl-none'
                      }`}
                    >
                      {msg.imageUrl && (
                        <div
                          className="rounded-[16px] overflow-hidden cursor-pointer"
                          onClick={() => setPatientImagePreview(msg.imageUrl || null)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.imageUrl}
                            alt="Document transmis"
                            className="max-h-40 w-auto rounded-[12px]"
                          />
                        </div>
                      )}

                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4" />
                          <span className="font-bold">Note Vocale ({msg.audioDuration || 10}s)</span>
                        </div>
                      )}

                      {msg.text && <p>{msg.text}</p>}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Patient Message Input with Image attachment */}
            <form onSubmit={handleSendPatientMessage} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePatientImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-full text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50"
                title="Joindre une ordonnance ou une photo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder="Écrivez votre message au médecin..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-full bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#0F172A]"
              />
              <GlassButton type="submit" variant="primary" size="sm">
                <Send className="w-4 h-4" />
              </GlassButton>
            </form>
          </GlassCard>
        )}
      </div>

      {/* Fullscreen Image Preview */}
      {patientImagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          onClick={() => setPatientImagePreview(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] p-2 bg-white rounded-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={patientImagePreview}
              alt="Aperçu"
              className="max-h-[80vh] w-auto rounded-[20px]"
            />
          </div>
        </div>
      )}

      <DemoSwitcher />
    </div>
  );
}
