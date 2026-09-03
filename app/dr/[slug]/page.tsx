'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getDoctorBySlug, addPatientToQueue, getPatientById, sendConsultationMessage, listenToPatient } from '@/lib/services/doctorService';
import { DoctorProfile, PatientQueueItem, ServiceType, ChatMessage } from '@/lib/types/doctor';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import {
  Stethoscope,
  ShieldCheck,
  MapPin,
  Clock,
  Video,
  User,
  Users,
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
  Smartphone,
  Send,
  Mic,
  MicOff,
  VideoOff,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  Printer
} from 'lucide-react';
import { WebRTCManager } from '@/lib/services/webrtcService';
import { uploadMedia } from '@/lib/services/storageService';
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
  const [forWho, setForWho] = useState<'self' | 'other'>('self');
  const [patientName, setPatientName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [age, setAge] = useState('30');
  const [patientPhone, setPatientPhone] = useState('+221 ');
  const [patientAddress, setPatientAddress] = useState('Dakar');
  const [patientWeight, setPatientWeight] = useState('');

  // Pour quelqu'un d'autre
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryAge, setBeneficiaryAge] = useState('');
  const [beneficiaryGender, setBeneficiaryGender] = useState<'M' | 'F'>('F');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('Dakar');
  const [beneficiaryWeight, setBeneficiaryWeight] = useState('');

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

  // Voice note recording states (MediaRecorder)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Visio WebRTC streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteDoctorVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const [hasDoctorVideo, setHasDoctorVideo] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Voice timer effect
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceSeconds(s => s + 1), 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Video camera stream effect & WebRTC connection when patient enters visio
  useEffect(() => {
    if (step === 'consultation' && serviceType === 'visio_consultation' && createdPatient?.id && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Initialiser WebRTC (Callee = Patient)
          const manager = new WebRTCManager(createdPatient.id, false, {
            onRemoteStream: (remoteStream) => {
              if (remoteDoctorVideoRef.current) {
                remoteDoctorVideoRef.current.srcObject = remoteStream;
                setHasDoctorVideo(true);
              }
            },
            onConnectionStateChange: (state) => {
              if (state === 'connected') {
                setHasDoctorVideo(true);
              } else if (state === 'disconnected' || state === 'failed') {
                setHasDoctorVideo(false);
              }
            },
          });
          webrtcRef.current = manager;
          manager.start(stream).catch(err => console.warn('WebRTC patient start notice:', err));
        })
        .catch(err => {
          console.warn('Patient camera access notice:', err);
        });

      return () => {
        if (webrtcRef.current) {
          webrtcRef.current.destroy();
          webrtcRef.current = null;
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        }
      };
    }
  }, [step, serviceType, createdPatient?.id]);

  // Toggle Video Track
  const toggleVideoTrack = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        return;
      }
    }
    setIsVideoOff(!isVideoOff);
  };

  // Toggle Audio Track
  const toggleAudioTrack = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsVideoMuted(!audioTrack.enabled);
        return;
      }
    }
    setIsVideoMuted(!isVideoMuted);
  };

  // Start Patient Voice Recording
  const startVoiceRecording = async () => {
    if (!createdPatient) return;
    audioChunksRef.current = [];
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = e => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          stream.getTracks().forEach(t => t.stop());

          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const recordedSecs = Math.max(1, voiceSeconds);

            const msg = await sendConsultationMessage(createdPatient.id, {
              sender: 'patient',
              type: 'voice',
              text: `Note vocale patient (${recordedSecs}s)`,
              audioUrl: dataUrl,
              audioDuration: recordedSecs,
            });

            setChatMessages(prev => [...prev, msg]);
          };
          reader.readAsDataURL(audioBlob);
        };

        recorder.start(200);
        setIsRecordingVoice(true);
      } else {
        setIsRecordingVoice(true);
      }
    } catch (err) {
      console.warn('Microphone permission notice:', err);
      setIsRecordingVoice(true);
    }
  };

  // Stop Patient Voice Recording
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      const duration = Math.max(1, voiceSeconds);
      setIsRecordingVoice(false);
      if (createdPatient) {
        sendConsultationMessage(createdPatient.id, {
          sender: 'patient',
          type: 'voice',
          text: `Note vocale patient (${duration}s)`,
          audioDuration: duration,
        }).then(msg => setChatMessages(prev => [...prev, msg]));
      }
    }
  };

  const handleToggleVoiceRecording = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Play audio voice note
  const handlePlayVoice = (msgId: string, audioUrl?: string) => {
    if (playingVoiceId === msgId) {
      currentAudioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);
      audio.play().catch(e => console.warn('Audio play error:', e));
      setPlayingVoiceId(msgId);
    } else {
      setPlayingVoiceId(msgId);
      setTimeout(() => setPlayingVoiceId(null), 3000);
    }
  };

  // Envoi de message texte par le patient
  const handleSendPatientMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !createdPatient?.id) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      const msg = await sendConsultationMessage(createdPatient.id, {
        sender: 'patient',
        type: 'text',
        text,
      });
      setChatMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err) {
      console.warn('Erreur envoi message patient:', err);
    }
  };

  // Envoi de document / photo par le patient
  const handlePatientImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdPatient?.id) return;

    try {
      const imageUrl = await uploadMedia(file, `consultations/${createdPatient.id}/${Date.now()}_${file.name}`);
      const msg = await sendConsultationMessage(createdPatient.id, {
        sender: 'patient',
        type: 'image',
        text: `Document médical / Bilan transmis (${file.name})`,
        imageUrl,
      });
      setChatMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err) {
      console.warn('Erreur upload document patient:', err);
    }
  };

  const loadDoctorData = useCallback(async (silent: boolean = false) => {
    if (!slug) return;
    if (!silent) setLoading(true);
    const docProfile = await getDoctorBySlug(slug);
    setDoctor(docProfile);
    if (!silent) setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadDoctorData();
    const interval = setInterval(() => {
      loadDoctorData(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadDoctorData]);

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

    if (forWho === 'other') {
      if (!beneficiaryName.trim()) {
        setError('Veuillez renseigner le Nom et Prénom de la personne à consulter.');
        return;
      }
      if (!beneficiaryAge || Number(beneficiaryAge) < 0) {
        setError('Veuillez renseigner l’âge de la personne à consulter.');
        return;
      }
      if (!beneficiaryAddress.trim()) {
        setError('Veuillez renseigner l’adresse de résidence de la personne.');
        return;
      }
    } else {
      if (!patientName.trim()) {
        setError('Veuillez renseigner votre Nom et Prénom.');
        return;
      }
      if (!age || Number(age) < 1) {
        setError('Veuillez renseigner votre âge.');
        return;
      }
    }

    if (!patientPhone || patientPhone.trim().length < 8) {
      setError('Veuillez renseigner un numéro de téléphone de contact valide.');
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

    const effectiveName = forWho === 'other' ? beneficiaryName.trim() : patientName.trim();
    const effectiveAge = forWho === 'other' ? (Number(beneficiaryAge) || 1) : (Number(age) || 30);
    const effectiveGender = forWho === 'other' ? beneficiaryGender : gender;

    try {
      const item = await addPatientToQueue({
        doctorSlug: slug,
        patientName: effectiveName,
        patientPhone: patientPhone.trim(),
        gender: effectiveGender,
        age: effectiveAge,
        forWho,
        beneficiaryName: forWho === 'other' ? beneficiaryName.trim() : undefined,
        beneficiaryAge: forWho === 'other' ? Number(beneficiaryAge) : undefined,
        beneficiaryGender: forWho === 'other' ? beneficiaryGender : undefined,
        beneficiaryAddress: forWho === 'other' ? beneficiaryAddress.trim() : patientAddress.trim(),
        beneficiaryWeight: forWho === 'other' ? (beneficiaryWeight.trim() || undefined) : (patientWeight.trim() || undefined),
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <GlassButton variant="primary" size="sm" onClick={() => loadDoctorData(false)}>
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser le statut
            </GlassButton>
            <Link href="/">
              <GlassButton variant="secondary" size="sm">
                Retour à l'accueil
              </GlassButton>
            </Link>
          </div>
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
              {/* Choix du Bénéficiaire */}
              <div className="space-y-2">
                <label className="block font-bold text-[#0F172A] text-xs">
                  Pour qui est cette consultation ? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForWho('self')}
                    className={`py-3 px-4 rounded-[20px] border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      forWho === 'self'
                        ? 'bg-blue-50 border-[#3B82F6] text-[#3B82F6] shadow-sm ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Pour moi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForWho('other')}
                    className={`py-3 px-4 rounded-[20px] border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      forWho === 'other'
                        ? 'bg-blue-50 border-[#3B82F6] text-[#3B82F6] shadow-sm ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Pour quelqu'un d'autre</span>
                  </button>
                </div>
              </div>

              {/* Si pour quelqu'un d'autre (enfant, parent, proche) */}
              {forWho === 'other' ? (
                <div className="p-4 rounded-[24px] bg-gradient-to-br from-blue-50/60 to-sky-50/30 border border-blue-100 space-y-4">
                  <span className="text-[11px] font-extrabold text-[#3B82F6] uppercase tracking-wider block">
                    Informations du Patient Bénéficiaire :
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#0F172A] mb-1 text-xs">
                        Nom & Prénom de la personne *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Awa Diallo (ma fille)"
                        value={beneficiaryName}
                        onChange={e => setBeneficiaryName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-[16px] bg-white border border-slate-200 focus:border-[#3B82F6] text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-[#0F172A] mb-1 text-xs">Sexe *</label>
                        <select
                          value={beneficiaryGender}
                          onChange={e => setBeneficiaryGender(e.target.value as 'M' | 'F')}
                          className="w-full px-3 py-2.5 rounded-[16px] bg-white border border-slate-200 text-xs text-[#0F172A]"
                        >
                          <option value="F">Femme / Fille</option>
                          <option value="M">Homme / Garçon</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#0F172A] mb-1 text-xs">Âge *</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          required
                          placeholder="Ex: 5"
                          value={beneficiaryAge}
                          onChange={e => setBeneficiaryAge(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-[16px] bg-white border border-slate-200 text-xs text-[#0F172A]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#0F172A] mb-1 text-xs">
                        Adresse / Ville de résidence *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Dakar, Grand Yoff"
                        value={beneficiaryAddress}
                        onChange={e => setBeneficiaryAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-[16px] bg-white border border-slate-200 text-xs text-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#0F172A] mb-1 text-xs">
                        Poids en kg <span className="text-slate-400 font-normal">(optionnel)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 16 kg"
                        value={beneficiaryWeight}
                        onChange={e => setBeneficiaryWeight(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-[16px] bg-white border border-slate-200 text-xs text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] mb-1 text-xs flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#3B82F6]" /> Numéro de Téléphone du Responsable (WhatsApp/SMS) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+221 77 123 45 67"
                      value={patientPhone}
                      onChange={e => setPatientPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[16px] bg-white border border-slate-200 text-xs text-[#0F172A]"
                    />
                  </div>
                </div>
              ) : (
                /* Si pour moi-même */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Nom & Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Mamadou Diallo"
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                        className="w-full px-4 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] text-[#0F172A] shadow-sm text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-[#0F172A] mb-1.5 text-xs">Sexe *</label>
                        <select
                          value={gender}
                          onChange={e => setGender(e.target.value as 'M' | 'F')}
                          className="w-full px-3.5 py-3 rounded-[20px] bg-white border border-slate-200/80 text-[#0F172A] shadow-sm text-xs"
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
                          className="w-full px-3.5 py-3 rounded-[20px] bg-white border border-slate-200/80 text-[#0F172A] shadow-sm text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="w-full px-4 py-3 rounded-[20px] bg-white border border-slate-200/80 text-[#0F172A] shadow-sm text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#0F172A] mb-1.5 text-xs">
                        Adresse / Ville *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Dakar, Mermoz"
                        value={patientAddress}
                        onChange={e => setPatientAddress(e.target.value)}
                        className="w-full px-4 py-3 rounded-[20px] bg-white border border-slate-200/80 text-[#0F172A] shadow-sm text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

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

            {/* Video Window if Visio */}
            {serviceType === 'visio_consultation' && (
              <div className="h-64 sm:h-72 bg-slate-950 p-4 rounded-[28px] border border-slate-800 flex flex-col justify-between relative overflow-hidden flex-shrink-0">
                <div className="flex-1 rounded-[20px] bg-slate-900 border border-slate-800 relative flex items-center justify-center overflow-hidden">
                  {/* Doctor Remote Stream */}
                  <video
                    ref={remoteDoctorVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${hasDoctorVideo ? 'block' : 'hidden'}`}
                  />

                  {!hasDoctorVideo && (
                    <div className="text-center space-y-2 p-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center text-2xl font-extrabold mx-auto shadow-2xl ring-4 ring-sky-400/30 animate-pulse">
                        Dr
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">{doctor.fullName}</h4>
                        <p className="text-[11px] text-sky-400 font-mono">Médecin en direct • Négociation WebRTC HD...</p>
                      </div>
                    </div>
                  )}

                  {/* Patient Local Camera Pip */}
                  <div className="absolute bottom-3 right-3 w-28 h-20 sm:w-32 sm:h-24 rounded-[16px] bg-slate-800 border-2 border-white/20 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                    />
                    {isVideoOff && (
                      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-1 text-center">
                        <span className="text-[9px] font-bold">Caméra Off</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient Video Controls Bar */}
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAudioTrack}
                    className={`p-2.5 rounded-full transition-all ${
                      isVideoMuted ? 'bg-rose-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={isVideoMuted ? 'Activer micro' : 'Couper micro'}
                  >
                    {isVideoMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleVideoTrack}
                    className={`p-2.5 rounded-full transition-all ${
                      isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={isVideoOff ? 'Activer caméra' : 'Couper caméra'}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
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
                          ONMS {doctor.onmsNumber || 'Certifié'}
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

                      {/* Voice Note with Audio Playback */}
                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-3 p-1">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(msg.id, msg.audioUrl)}
                            className={`p-2 rounded-full transition-transform active:scale-95 ${
                              msg.sender === 'patient' ? 'bg-white/20 text-white' : 'bg-[#3B82F6] text-white'
                            }`}
                          >
                            {playingVoiceId === msg.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs">Note Vocale ({msg.audioDuration || 5}s)</span>
                              {playingVoiceId === msg.id && (
                                <span className="flex items-center gap-0.5">
                                  <span className="w-1 h-3 bg-current animate-pulse rounded-full" />
                                  <span className="w-1 h-4 bg-current animate-pulse delay-75 rounded-full" />
                                  <span className="w-1 h-2 bg-current animate-pulse delay-150 rounded-full" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] opacity-80 block">Écouter le message</span>
                          </div>
                        </div>
                      )}

                      {msg.text && msg.type !== 'voice' && <p>{msg.text}</p>}

                      <span
                        className={`text-[10px] block text-right ${
                          msg.sender === 'patient' ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Patient Message Input with Image & Voice MediaRecorder */}
            <div className="p-3 border-t border-slate-100 bg-white/95 backdrop-blur-md flex items-center gap-2">
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

              {/* Voice Record Button for Patient */}
              <button
                type="button"
                onClick={handleToggleVoiceRecording}
                className={`p-2.5 rounded-full transition-all ${
                  isRecordingVoice
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg ring-4 ring-rose-500/20'
                    : 'text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50'
                }`}
                title={isRecordingVoice ? 'Arrêter et envoyer' : 'Enregistrer une note vocale'}
              >
                <Mic className="w-5 h-5" />
              </button>

              {isRecordingVoice ? (
                <div className="flex-1 px-4 py-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    Enregistrement ({voiceSeconds}s)...
                  </span>
                  <button
                    type="button"
                    className="text-[11px] font-extrabold underline cursor-pointer bg-rose-600 text-white px-3 py-1 rounded-full hover:bg-rose-700 transition-colors"
                    onClick={handleToggleVoiceRecording}
                  >
                    Envoyer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendPatientMessage} className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Écrivez votre message au médecin..."
                    value={chatInput}
                    onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300)}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs focus:outline-none focus:bg-white text-[#0F172A]"
                  />
                  <GlassButton type="submit" variant="primary" size="sm">
                    <Send className="w-4 h-4" />
                  </GlassButton>
                </form>
              )}
            </div>
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
    </div>
  );
}
