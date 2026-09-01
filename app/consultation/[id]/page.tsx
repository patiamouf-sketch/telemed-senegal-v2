'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getPatientById, getDoctorBySlug, sendConsultationMessage, archiveConsultationSession, listenToPatient } from '@/lib/services/doctorService';
import { PatientQueueItem, ChatMessage, DoctorProfile } from '@/lib/types/doctor';
import { OfficialPrescription } from '@/lib/types/prescription';
import { PrescriptionDrawer } from '@/components/doctor/PrescriptionDrawer';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { DemoSwitcher } from '@/components/ui/DemoSwitcher';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageSquare,
  FileText,
  Send,
  ShieldCheck,
  Play,
  Pause,
  ExternalLink,
  Printer,
  Stethoscope,
  X,
  Volume2,
  ArrowLeft,
  Lock,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function DedicatedConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { doctorProfile } = useAuth();

  const [patient, setPatient] = useState<PatientQueueItem | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Drawer states
  const [showPrescriptionDrawer, setShowPrescriptionDrawer] = useState(false);
  const [latestPrescription, setLatestPrescription] = useState<OfficialPrescription | undefined>(undefined);

  // Voice note simulation / MediaRecorder state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Video stream ref
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Image preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const unsub = listenToPatient(id, updated => {
      if (updated) {
        setPatient(updated);
        if (updated.messages) setMessages(updated.messages);
        if (updated.prescription) setLatestPrescription(updated.prescription);
        if (!doctor) {
          getDoctorBySlug(updated.doctorSlug).then(d => setDoctor(d || doctorProfile));
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id, doctorProfile]);

  const activeDoc = doctor || doctorProfile || {
    id: 'doc-active-1',
    fullName: 'Dr. Ibrahima Sow',
    speciality: 'Cardiologie & Médecine Interne',
    onmsNumber: 'SN-ONMS-4829',
    clinicName: 'Cabinet Médical Al-Madina',
    city: 'Dakar',
    phone: '+221 77 654 32 10',
    slug: 'dr-sow',
    status: 'active' as const,
    consultationFee: 7000,
    avisMedicalFee: 3000,
    visioConsultationFee: 7000,
    createdAt: new Date().toISOString(),
    availableForTeleconsult: true,
    email: 'dr.sow@telemed.sn',
    nin: '1988120400341'
  };

  const licenseCheck = isDoctorLicenseValid(activeDoc);

  // Camera stream for Visio
  useEffect(() => {
    if (patient?.serviceType === 'visio_consultation' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn('Camera stream fallback mode:', err);
        });

      return () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [patient?.serviceType]);

  // Timer for Visio
  useEffect(() => {
    if (patient?.serviceType === 'visio_consultation' && !patient.isReadOnly) {
      const timer = setInterval(() => setCallSeconds(s => s + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [patient?.serviceType, patient?.isReadOnly]);

  // Voice recording timer
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceSeconds(s => s + 1), 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle Video
  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const vTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled;
        setIsVideoOff(!vTrack.enabled);
        return;
      }
    }
    setIsVideoOff(!isVideoOff);
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const aTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled;
        setIsVideoMuted(!aTrack.enabled);
        return;
      }
    }
    setIsVideoMuted(!isVideoMuted);
  };

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !patient || patient.isReadOnly) return;

    const msg = await sendConsultationMessage(patient.id, {
      sender: 'doctor',
      type: 'text',
      text: inputText.trim(),
    });

    setMessages(prev => [...prev, msg]);
    setInputText('');
  };

  // Real Voice Note Recording
  const startVoiceRecording = async () => {
    if (!patient || patient.isReadOnly) return;
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
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          stream.getTracks().forEach(t => t.stop());

          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const recordedSecs = Math.max(1, voiceSeconds);

            const msg = await sendConsultationMessage(patient.id, {
              sender: 'doctor',
              type: 'voice',
              text: `Note vocale médicale (${recordedSecs}s)`,
              audioUrl: dataUrl,
              audioDuration: recordedSecs,
            });

            setMessages(prev => [...prev, msg]);
          };
          reader.readAsDataURL(audioBlob);
        };

        recorder.start(200);
        setIsRecordingVoice(true);
      } else {
        setIsRecordingVoice(true);
      }
    } catch (err) {
      console.warn('Microphone error:', err);
      setIsRecordingVoice(true);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      const duration = Math.max(1, voiceSeconds);
      setIsRecordingVoice(false);
      if (patient) {
        sendConsultationMessage(patient.id, {
          sender: 'doctor',
          type: 'voice',
          text: `Note vocale médicale (${duration}s)`,
          audioDuration: duration,
        }).then(msg => setMessages(prev => [...prev, msg]));
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

  // Play audio
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

  // Send Image Upload
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient || patient.isReadOnly) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const imageUrl = event.target?.result as string;
      const msg = await sendConsultationMessage(patient.id, {
        sender: 'doctor',
        type: 'image',
        text: `Bilan / Document médical transmis (${file.name})`,
        imageUrl,
      });
      setMessages(prev => [...prev, msg]);
    };
    reader.readAsDataURL(file);
  };

  // Prescription Sealed callback -> locks consultation to Read-Only
  const handlePrescriptionSealed = async (prescription: OfficialPrescription) => {
    if (!patient) return;
    setLatestPrescription(prescription);

    const msg = await sendConsultationMessage(patient.id, {
      sender: 'doctor',
      type: 'prescription',
      text: `📋 ORDONNANCE OFFICIELLE SCELLÉE (SHA-256) :\n${prescription.items.map(i => `• ${i.medication} (${i.dosage})`).join('\n')}`,
      prescriptionData: prescription,
      isPrescription: true,
    });

    setMessages(prev => [...prev, msg]);

    // Clôture et passage automatique en lecture seule
    const updated = await archiveConsultationSession(patient.id, prescription);
    if (updated) {
      setPatient(updated);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center bg-white/80 max-w-sm shadow-soft-float">
          <Stethoscope className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#0F172A]">Accès à la salle de consultation...</p>
        </GlassCard>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center bg-white/90 max-w-md space-y-4 shadow-soft-float">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Consultation Introuvable</h2>
          <p className="text-xs text-slate-500">
            Le dossier médical n° <span className="font-mono">{id}</span> n'existe pas ou a expiré.
          </p>
          <Link href="/dashboard">
            <GlassButton variant="primary" size="sm">
              Retour au Dashboard
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 px-3 sm:px-6 lg:px-8 font-sans flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full space-y-4 flex-1 flex flex-col">
        {/* Top Header Bar with Mandatory NIN Display for Legal Traceability */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 backdrop-blur-2xl border border-white/80 rounded-[28px] px-6 py-3.5 shadow-soft-float flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50 rounded-full transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-md font-extrabold text-sm">
              {patient.serviceType === 'visio_consultation' ? <Video className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A]">{patient.patientName}</h1>
                {/* Permanent NIN Badge for Legal Traceability */}
                <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
                  NIN : {patient.patientNin}
                </span>

                <Badge variant="blue" size="sm">
                  {patient.gender === 'F' ? 'Femme' : 'Homme'} • {patient.age} ans
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Praticien : <strong>{activeDoc.fullName}</strong> (ONMS: {activeDoc.onmsNumber}) • Réf: {patient.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {patient.serviceType === 'visio_consultation' && !patient.isReadOnly && (
              <div className="px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {formatTimer(callSeconds)}
              </div>
            )}

            {!patient.isReadOnly ? (
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!licenseCheck.isValid) {
                    alert(licenseCheck.message || 'Votre licence médicale a expiré.');
                    return;
                  }
                  setShowPrescriptionDrawer(true);
                }}
                className="text-xs shadow-pill font-bold"
              >
                <FileText className="w-4 h-4" />
                <span>Rédiger l'Ordonnance</span>
              </GlassButton>
            ) : (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Séance Clôturée • Lecture Seule
                </div>

                {latestPrescription && (
                  <Link href={`/verify/${latestPrescription.hash}`} target="_blank">
                    <GlassButton size="sm" variant="success" className="text-xs">
                      <Printer className="w-3.5 h-3.5" />
                      <span>PDF Ordonnance</span>
                    </GlassButton>
                  </Link>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Read Only Alert Banner if session ended */}
        {patient.isReadOnly && (
          <div className="p-3.5 rounded-[24px] bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Cette consultation a été <strong>scellée et archivée</strong>. L'ordonnance certifiée SHA-256 a été transmise au patient.</span>
            </div>
            <Link href="/dashboard">
              <GlassButton size="sm" variant="secondary" className="text-xs flex-shrink-0">
                Retour au Dashboard
              </GlassButton>
            </Link>
          </div>
        )}

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 relative overflow-hidden min-h-[560px]">
          {/* Picture-in-Picture Video for Visio */}
          {patient.serviceType === 'visio_consultation' && (
            <motion.div
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`transition-all duration-300 rounded-[32px] bg-slate-950/95 backdrop-blur-2xl border border-slate-800 shadow-2xl p-4 flex flex-col justify-between overflow-hidden ${
                isPipMinimized
                  ? 'h-24 md:w-64 md:h-36'
                  : 'h-64 md:h-auto md:w-5/12'
              }`}
            >
              <div className="flex items-center justify-between text-white text-xs pb-2 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5 text-sky-400">
                  <Video className="w-3.5 h-3.5" />
                  Flux WebRTC HD Chiffré
                </span>

                <button
                  onClick={() => setIsPipMinimized(!isPipMinimized)}
                  className="p-1 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  {isPipMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {!isPipMinimized && (
                <div className="flex-1 rounded-[24px] bg-slate-900 border border-slate-800 my-2 relative flex items-center justify-center overflow-hidden">
                  <div className="text-center space-y-2 p-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-sky-400 text-white flex items-center justify-center text-2xl font-extrabold mx-auto shadow-2xl ring-4 ring-sky-400/30 animate-pulse">
                      {patient.patientName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{patient.patientName}</h3>
                      <p className="text-[10px] text-emerald-400 font-mono">Audio & Vidéo Connectés</p>
                    </div>
                  </div>

                  {/* Picture-in-Picture Doctor Local Screen */}
                  <div className="absolute bottom-2.5 right-2.5 w-28 h-20 rounded-[18px] bg-slate-800 border border-white/20 shadow-xl flex flex-col items-center justify-center overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                    />
                    {isVideoOff && (
                      <div className="w-full h-full bg-gradient-to-b from-sky-900/60 to-slate-900 flex flex-col items-center justify-center text-white">
                        <Stethoscope className="w-4 h-4 text-sky-400 mb-0.5" />
                        <span className="text-[9px] font-bold">Caméra Off</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Video Toolbar */}
              {!patient.isReadOnly && (
                <div className="pt-2 flex items-center justify-center gap-2.5">
                  <button
                    onClick={toggleAudio}
                    className={`p-2.5 rounded-full transition-all ${
                      isVideoMuted ? 'bg-rose-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isVideoMuted ? 'Activer micro' : 'Couper micro'}
                  >
                    {isVideoMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={toggleVideo}
                    className={`p-2.5 rounded-full transition-all ${
                      isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isVideoOff ? 'Activer caméra' : 'Couper caméra'}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Crystal Messaging Chat Area */}
          <GlassCard className="flex-1 flex flex-col bg-white/80 backdrop-blur-2xl border border-white/70 shadow-soft-float overflow-hidden">
            {/* Clinical Reason Pill */}
            <div className="px-6 py-2.5 bg-blue-50/40 border-b border-blue-100/60 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0F172A]">Motif clinique :</span> {patient.reason}
              </div>
              <Badge variant={patient.urgency === 'urgente' ? 'rose' : 'blue'} size="sm">
                Priorité : {patient.urgency}
              </Badge>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 max-h-[480px]">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'doctor'
                      ? 'items-end'
                      : msg.sender === 'system'
                      ? 'items-center'
                      : 'items-start'
                  }`}
                >
                  {msg.sender === 'system' ? (
                    <div className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium my-1">
                      {msg.text}
                    </div>
                  ) : msg.prescriptionData ? (
                    /* Official Certified Prescription Card inside Chat */
                    <div className="max-w-md w-full rounded-[28px] bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 border-2 border-emerald-300 p-5 shadow-lg space-y-3 font-sans">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider">
                            Ordonnance Médicale Scellée (SHA-256)
                          </span>
                        </div>
                        <Badge variant="emerald" size="sm">
                          ONMS {activeDoc.onmsNumber}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-slate-700">
                        <p className="font-bold text-slate-900">
                          {patient.patientName} (NIN: {patient.patientNin})
                        </p>
                        <div className="bg-white/90 p-3 rounded-[18px] border border-emerald-100 space-y-1.5">
                          {msg.prescriptionData.items.map((it, idx) => (
                            <div key={idx} className="text-xs">
                              <strong>• {it.medication}</strong> : {it.dosage} ({it.duration})
                            </div>
                          ))}
                        </div>
                        {msg.prescriptionData.dietaryAdvice && (
                          <p className="text-[11px] text-slate-500 italic mt-1">
                            Conseils CHD : {msg.prescriptionData.dietaryAdvice}
                          </p>
                        )}
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-[180px]">
                          Hash : {msg.prescriptionData.hash}
                        </span>
                        <Link
                          href={`/verify/${msg.prescriptionData.hash}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                        >
                          <span>Certificat QR</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* Regular Bubble */
                    <div
                      className={`max-w-[80%] rounded-[24px] p-3.5 text-xs leading-relaxed shadow-sm space-y-2 ${
                        msg.sender === 'doctor'
                          ? 'bg-[#3B82F6] text-white rounded-br-none'
                          : 'bg-slate-100 text-[#1E293B] rounded-bl-none'
                      }`}
                    >
                      {/* Image Preview */}
                      {msg.imageUrl && (
                        <div
                          className="rounded-[18px] overflow-hidden cursor-pointer max-w-xs shadow-md"
                          onClick={() => setPreviewImage(msg.imageUrl || null)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.imageUrl}
                            alt="Document médical"
                            className="w-full h-auto object-cover max-h-48 rounded-[16px]"
                          />
                        </div>
                      )}

                      {/* Voice Note Audio Wave Player */}
                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-3 p-1">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(msg.id, msg.audioUrl)}
                            className={`p-2 rounded-full transition-transform active:scale-95 ${
                              msg.sender === 'doctor' ? 'bg-white/20 text-white' : 'bg-[#3B82F6] text-white'
                            }`}
                          >
                            {playingVoiceId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs">
                                Note Vocale ({msg.audioDuration || 10}s)
                              </span>
                              {playingVoiceId === msg.id && (
                                <span className="flex items-center gap-0.5">
                                  <span className="w-1 h-3 bg-white animate-pulse rounded-full" />
                                  <span className="w-1 h-4 bg-white animate-pulse delay-75 rounded-full" />
                                  <span className="w-1 h-2 bg-white animate-pulse delay-150 rounded-full" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] opacity-80 block">Format WebM/OGG Sécurisé</span>
                          </div>
                        </div>
                      )}

                      {msg.text && msg.type !== 'voice' && <p>{msg.text}</p>}

                      <span
                        className={`text-[10px] block text-right ${
                          msg.sender === 'doctor' ? 'text-blue-100' : 'text-slate-400'
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
              <div ref={messagesEndRef} />
            </div>

            {/* Medical Toolbar & Input Bar */}
            {!patient.isReadOnly ? (
              <div className="p-3 border-t border-slate-100 bg-white/90 backdrop-blur-md flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />

                {/* Attach Document / Image */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-full text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50 transition-colors"
                  title="Joindre un bilan ou une photo"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {/* Voice Record */}
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
                      Enregistrement vocal ({voiceSeconds}s)...
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
                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Écrivez votre message médical..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs focus:outline-none focus:bg-white text-[#0F172A]"
                    />
                    <GlassButton type="submit" variant="primary" size="sm">
                      <Send className="w-4 h-4" />
                    </GlassButton>
                  </form>
                )}
              </div>
            ) : (
              <div className="p-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-400 font-medium">
                Cette consultation est terminée et archivée en lecture seule.
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Prescription Drawer */}
      <AnimatePresence>
        {showPrescriptionDrawer && (
          <PrescriptionDrawer
            doctor={activeDoc}
            patient={patient}
            onClose={() => setShowPrescriptionDrawer(false)}
            onPrescriptionSealed={handlePrescriptionSealed}
          />
        )}
      </AnimatePresence>

      {/* Lightbox for Images */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] p-2 bg-white rounded-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Document médical"
              className="max-h-[80vh] w-auto rounded-[20px]"
            />
          </div>
        </div>
      )}

      <DemoSwitcher />
    </div>
  );
}
