'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  getDoctorBySlug,
  addPatientToQueue,
  getPatientById,
  sendConsultationMessage,
  listenToPatient,
  listenToConsultationMessages,
  listenToDoctorProfile,
  getFollowUpStatus
} from '@/lib/services/doctorService';
import { DoctorProfile, PatientQueueItem, ServiceType, ChatMessage } from '@/lib/types/doctor';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { AudioVoiceNote } from '@/components/consultation/AudioVoiceNote';
import { getSupportedAudioMimeType } from '@/lib/utils/audioHelper';
import {
  getPatientArrivalWhatsAppUrl,
  getPharmacyShareWhatsAppUrl,
} from '@/lib/utils/whatsappHelper';
import {
  Stethoscope,
  ShieldCheck,
  MapPin,
  Clock,
  User,
  Users,
  Phone,
  MessageCircle,
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
  Play,
  Pause,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  Printer,
  Link as LinkIcon,
  ShieldAlert,
  Scale
} from 'lucide-react';
import { uploadMedia } from '@/lib/services/storageService';
import { CGUModal } from '@/components/legal/CGUModal';
import {
  playMessagePopSound,
  isSoundMuted,
  toggleSoundMuted,
  listenToSoundMuted
} from '@/lib/utils/soundAlert';
import confetti from 'canvas-confetti';
import Link from 'next/link';

export default function PatientRoomPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAgreedCGU, setHasAgreedCGU] = useState(false);
  const [showCGUModal, setShowCGUModal] = useState(false);

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
  const [serviceType, setServiceType] = useState<ServiceType>('teleconsultation');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave');
  const [error, setError] = useState<string | null>(null);

  // Active queue session
  const [createdPatient, setCreatedPatient] = useState<PatientQueueItem | null>(null);
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingText, setIsSendingText] = useState(false);
  const [patientImagePreview, setPatientImagePreview] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const isFetchingDoctorRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevMessagesCountRef = useRef<number>(0);
  const voiceSecondsRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const loadDoctorData = useCallback(async (silent: boolean = false) => {
    if (!slug) return;
    if (isFetchingDoctorRef.current) return;
    isFetchingDoctorRef.current = true;

    if (!silent) setLoading(true);
    try {
      const docProfile = await getDoctorBySlug(slug);
      setDoctor(docProfile);
    } catch (e) {
      console.warn('Erreur loadDoctorData:', e);
    } finally {
      if (!silent) setLoading(false);
      isFetchingDoctorRef.current = false;
    }
  }, [slug]);

  useEffect(() => {
    loadDoctorData();
    const safetyTimer = setTimeout(() => setLoading(false), 2000);

    // Écouteur en direct fluide sans polling agressif
    const unsub = listenToDoctorProfile(slug, (profile) => {
      if (profile) {
        setDoctor(profile);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [slug, loadDoctorData]);

  // Restauration de session patient (via paramètre URL ?session=... ou localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined' && slug) {
      const urlParams = new URLSearchParams(window.location.search);
      const querySessionId = urlParams.get('session');
      const savedId = querySessionId || localStorage.getItem(`telemed_session_${slug}`);

      if (savedId && !createdPatient) {
        getPatientById(savedId).then((p) => {
          if (p) {
            setCreatedPatient(p);
            localStorage.setItem(`telemed_session_${slug}`, p.id);
            if (p.paymentConfirmedByDoctor || p.status === 'in_consultation' || p.status === 'completed') {
              setStep('consultation');
            } else if (p.paymentDeclared) {
              setStep('waiting');
            }
          }
        }).catch(() => {});
      }
    }
  }, [slug]);

  const handleResetSession = () => {
    if (typeof window !== 'undefined' && slug) {
      localStorage.removeItem(`telemed_session_${slug}`);
    }
    setCreatedPatient(null);
    setChatMessages([]);
    setStep('form');
  };

  // Auto-scroll systématique lors de l'arrivée ou mise à jour de messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [chatMessages.length]);

  // Gestion ultra-robuste du viewport mobile (clavier virtuel iOS/Android)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (step === 'consultation') {
      document.body.style.overflow = 'hidden';
    }

    const updateViewport = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty('--vh', `${window.visualViewport.height * 0.01}px`);
        document.documentElement.style.setProperty(
          '--keyboard-open',
          window.visualViewport.height < window.innerHeight * 0.85 ? '1' : '0'
        );
      }
      if (step === 'consultation') {
        window.scrollTo(0, 0);
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);
    updateViewport(); // init

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  }, [step]);

  // Synchronisation de l'état silencieux global
  useEffect(() => {
    setIsAudioMuted(isSoundMuted());
    const unsub = listenToSoundMuted(m => setIsAudioMuted(m));
    return () => unsub();
  }, []);

  const handleToggleAudioMute = () => {
    const next = toggleSoundMuted();
    setIsAudioMuted(next);
  };

  // Voice timer effect
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      voiceSecondsRef.current = 0;
      setVoiceSeconds(0);
      interval = setInterval(() => {
        setVoiceSeconds(s => {
          const next = s + 1;
          voiceSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      voiceSecondsRef.current = 0;
      setVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Start Patient Voice Recording (MediaRecorder Multi-Formats)
  const startVoiceRecording = async () => {
    if (!createdPatient) return;
    audioChunksRef.current = [];
    voiceSecondsRef.current = 0;
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = getSupportedAudioMimeType();
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = e => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());
          const recordedSecs = Math.max(1, voiceSecondsRef.current);
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';

          try {
            const audioUrl = await uploadMedia(
              audioBlob,
              `consultations/${createdPatient.id}/voices/patient_${Date.now()}.${ext}`
            );

            const msg = await sendConsultationMessage(createdPatient.id, {
              sender: 'patient',
              type: 'voice',
              text: `Note vocale patient (${recordedSecs}s)`,
              audioUrl,
              audioDuration: recordedSecs,
            });

            setChatMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
          } catch (err) {
            console.error('Erreur téléversement audio patient:', err);
          }
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
      const duration = Math.max(1, voiceSecondsRef.current);
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
  const handleSendPatientMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !createdPatient?.id || isSendingText) return;

    const text = chatInput.trim();
    setChatInput('');
    setIsSendingText(true);

    try {
      const msg = await sendConsultationMessage(createdPatient.id, {
        sender: 'patient',
        type: 'text',
        text,
      });
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const newList = [...prev, msg];
        return newList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });
    } catch (err) {
      console.warn('Erreur envoi message patient:', err);
      setChatInput(text);
    } finally {
      setIsSendingText(false);
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


  // Écouteur temps réel dès que la session patient est créée (statut de paiement + double canal messages)
  useEffect(() => {
    if (!createdPatient?.id) return;

    // Fonction unifiée de synchronisation et déduplication des messages
    const syncIncomingMessages = (incoming: ChatMessage[]) => {
      if (!incoming || incoming.length === 0) return;

      setChatMessages(prev => {
        const map = new Map<string, ChatMessage>();
        prev.forEach(m => map.set(m.id, m));
        incoming.forEach(m => {
          const existing = map.get(m.id);
          // Remplacer si nouveau ou données plus complètes
          map.set(m.id, { ...existing, ...m });
        });

        const nextArray = Array.from(map.values()).sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime() || (a as any).createdAt || 0;
          const timeB = new Date(b.timestamp).getTime() || (b as any).createdAt || 0;
          return timeA - timeB;
        });

        // Vérification fine : éviter un re-render si strictement inchangé
        const isIdentical =
          prev.length === nextArray.length &&
          prev.every(
            (m, i) =>
              m.id === nextArray[i].id &&
              m.text === nextArray[i].text &&
              m.type === nextArray[i].type &&
              m.audioUrl === nextArray[i].audioUrl &&
              m.imageUrl === nextArray[i].imageUrl
          );
        if (isIdentical) return prev;

        // Notification sonore : détecter si de nouveaux messages émanent du médecin
        if (prev.length > 0) {
          const prevIds = new Set(prev.map(p => p.id));
          const newFromDoctor = nextArray.filter(m => !prevIds.has(m.id) && m.sender === 'doctor');
          if (newFromDoctor.length > 0) {
            playMessagePopSound();
          }
        }

        return nextArray;
      });
    };

    // 1. Canal Document Parent (patient_queues/{patientId})
    const unsubPatient = listenToPatient(createdPatient.id, updated => {
      if (updated) {
        setCreatedPatient(updated);

        // Synchronisation immédiate des messages présents sur le document parent
        if (updated.messages && updated.messages.length > 0) {
          syncIncomingMessages(updated.messages);
        }

        if (updated.status === 'in_consultation' && step !== 'consultation') {
          setStep('consultation');
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

    // 2. Canal Sous-Collection Messages (patient_queues/{patientId}/messages)
    const unsubMessages = listenToConsultationMessages(createdPatient.id, msgs => {
      if (msgs && msgs.length > 0) {
        syncIncomingMessages(msgs);
      }
    });

    return () => {
      unsubPatient();
      unsubMessages();
    };
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
    if (!hasAgreedCGU) {
      setError('Veuillez certifier qu\'il ne s\'agit pas d\'une urgence vitale et accepter les Conditions Générales d\'Utilisation.');
      return;
    }

    setStep('payment');
  };

  // Handle "J'ai effectué le paiement"
  const handleDeclarePayment = async () => {
    setError(null);
    const amount = doctor?.consultationFee || doctor?.visioConsultationFee || doctor?.avisMedicalFee || 5000;

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
        serviceType: 'teleconsultation',
        amountPaid: amount,
        paymentMethod,
        paymentDeclared: true,
        paymentConfirmedByDoctor: false,
        reason,
        urgency: 'normale',
      });

      setCreatedPatient(item);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`telemed_session_${slug}`, item.id);
      }
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

  const selectedPrice = doctor.consultationFee || doctor.visioConsultationFee || doctor.avisMedicalFee || 5000;
  const activeTransferNum = paymentMethod === 'wave'
    ? (doctor.waveNumber || doctor.phone)
    : (doctor.omNumber || doctor.phone);

  if (step === 'consultation' && createdPatient) {
    const followUp = getFollowUpStatus(createdPatient);
    const consultationUrl = typeof window !== 'undefined' ? `${window.location.origin}/consultation/${createdPatient.id}` : '';

    return (
      <div className="fixed inset-0 flex flex-col bg-slate-50 font-sans chat-fixed-viewport z-50">
        {/* Top Header */}
        <div className="flex-none bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-sm z-20 sticky top-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-extrabold text-[#0F172A] text-sm sm:text-base leading-tight">
                  Consultation: {doctor.fullName}
                </h3>
                <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {followUp.inFollowUp ? followUp.label : 'Téléconsultation (Audio & Message)'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAudioMute}
                className={`p-2 rounded-full transition-all text-xs flex items-center gap-1.5 shadow-sm ${
                  isAudioMuted
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              {followUp.isExpired && (
                <GlassButton size="sm" variant="secondary" onClick={handleResetSession} className="text-[10px] !px-2 !py-1">
                  Quitter
                </GlassButton>
              )}
            </div>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div
          ref={chatContainerRef}
          onScroll={e => {
            const t = e.currentTarget;
            setShowScrollBottom(t.scrollHeight - t.scrollTop - t.clientHeight > 140);
          }}
          className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 relative flex flex-col"
        >
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col p-4 space-y-4">
            
            {/* Banner Link */}
            <div className="flex-none p-3 bg-blue-50/70 rounded-[16px] border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
              <div className="flex items-center gap-2 text-slate-700 min-w-0">
                <LinkIcon className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
                <span className="font-semibold text-slate-600 flex-shrink-0">Dossier :</span>
                <span className="font-mono font-bold text-[#0F172A] truncate">{consultationUrl}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (consultationUrl) {
                    navigator.clipboard.writeText(consultationUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }
                }}
                className="flex-shrink-0 text-[11px] font-bold text-[#3B82F6] bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-100 flex items-center justify-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copié' : 'Copier'}
              </button>
            </div>

            {/* Bannières Follow Up */}
            {followUp.inFollowUp && (
              <div className="flex-none p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-[#0F172A]">Suivi Médical Actif</h4>
                    <p className="text-[10px] text-amber-800 leading-relaxed mt-0.5">
                      Consultation clôturée, délai de 24h pour vos questions.
                    </p>
                  </div>
                </div>
                <Badge variant="amber" size="sm" className="flex-shrink-0 font-mono font-bold">
                  Reste {followUp.remainingHours}h
                </Badge>
              </div>
            )}
            
            {followUp.isExpired && (
              <div className="flex-none p-3 bg-slate-100 border border-slate-200 rounded-[16px] flex items-center gap-2 text-[11px] text-slate-600">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Le délai de grâce de 24h est écoulé. Dossier en lecture seule.</span>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 flex flex-col space-y-3 pb-4">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
                  {msg.sender === 'system' ? (
                    <div className="px-3 py-1 rounded-full bg-slate-200/60 text-slate-500 text-[10px] font-medium my-1">
                      {msg.text}
                    </div>
                  ) : msg.prescriptionData ? (
                    <div className="max-w-[90%] sm:max-w-md w-full rounded-[20px] bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-300 p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <strong className="text-[11px] sm:text-xs text-emerald-900 uppercase">Ordonnance Scellée</strong>
                        </div>
                      </div>
                      <div className="bg-white/90 p-3 rounded-[12px] border border-emerald-100 space-y-1 text-xs">
                        {msg.prescriptionData.items.map((it, idx) => (
                          <div key={idx} className="text-slate-800">
                            <strong>• {it.medication}</strong> : {it.dosage} ({it.duration})
                          </div>
                        ))}
                      </div>
                      {msg.prescriptionData.dietaryAdvice && (
                        <p className="text-[10px] text-slate-600 italic">Conseils : {msg.prescriptionData.dietaryAdvice}</p>
                      )}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={msg.prescriptionData.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 bg-emerald-100/60 p-2 rounded-[12px] justify-center flex-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> Voir l'Ordonnance
                        </a>
                        <a
                          href={getPharmacyShareWhatsAppUrl({
                            doctorName: doctor.fullName,
                            patientName: createdPatient?.patientName || patientName,
                            rxUrl: msg.prescriptionData.verificationUrl,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 p-2 rounded-[12px] flex items-center gap-1.5 justify-center flex-1 shadow-sm transition-colors"
                          title="Transmettre l'ordonnance à ma pharmacie via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Envoyer Pharmacie</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className={`max-w-[85%] rounded-[18px] p-3 shadow-sm space-y-2 ${msg.sender === 'patient' ? 'bg-[#3B82F6] text-white rounded-br-none' : 'bg-white border border-slate-100 text-[#1E293B] rounded-bl-none'}`}>
                      {msg.imageUrl && (
                        <div className="rounded-[12px] overflow-hidden cursor-pointer bg-slate-900/5" onClick={() => setPatientImagePreview(msg.imageUrl || null)}>
                          <img src={msg.imageUrl} alt="Document" className="max-h-40 w-auto rounded-[12px] object-contain" />
                        </div>
                      )}
                      {msg.type === 'voice' && (
                        <AudioVoiceNote
                          audioUrl={msg.audioUrl}
                          audioDuration={msg.audioDuration}
                          isSender={msg.sender === 'patient'}
                        />
                      )}
                      {msg.text && msg.type !== 'voice' && <p className="text-xs sm:text-sm leading-relaxed">{msg.text}</p>}
                      <span className={`text-[9px] block text-right mt-1 ${msg.sender === 'patient' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} className="h-2" />
            </div>
          </div>
        </div>

        {/* Pastille flottante de défilement vers le bas */}
        {showScrollBottom && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce transition-transform active:scale-95"
            >
              <span>Nouveaux messages ↓</span>
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="flex-none bg-white border-t border-slate-200 safe-bottom-padding z-20">
          <div className="max-w-3xl mx-auto p-2 sm:p-3">
            {followUp.isExpired ? (
              <div className="text-center p-2">
                <GlassButton variant="primary" size="sm" onClick={handleResetSession} className="w-full text-xs">
                  Demander une nouvelle consultation
                </GlassButton>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePatientImageUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50 flex-shrink-0 mb-0.5" title="Joindre une photo">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={handleToggleVoiceRecording} className={`p-2.5 rounded-full transition-all flex-shrink-0 mb-0.5 ${isRecordingVoice ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50'}`} title="Note vocale">
                  <Mic className="w-5 h-5" />
                </button>
                {isRecordingVoice ? (
                  <div className="flex-1 min-h-[44px] px-4 rounded-[22px] bg-rose-50 border border-rose-200 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      {voiceSeconds}s
                    </span>
                    <button type="button" onClick={handleToggleVoiceRecording} className="text-[11px] font-extrabold text-white bg-rose-600 px-3 py-1 rounded-full">
                      Envoyer
                    </button>
                  </div>
                ) : (
                    <form onSubmit={handleSendPatientMessage} className="flex-1 flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[22px] focus-within:border-[#3B82F6] focus-within:bg-white transition-colors overflow-hidden p-1 pr-1.5">
                    <textarea
                      rows={1}
                      placeholder="Message..."
                      value={chatInput}
                      onFocus={() => {
                        window.scrollTo(0, 0);
                        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
                      }}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!isSendingText) handleSendPatientMessage(e as any);
                        }
                      }}
                      style={{ minHeight: '36px', maxHeight: '120px' }}
                      className="flex-1 px-3 py-2 text-base sm:text-sm text-[#0F172A] bg-transparent focus:outline-none resize-none self-center disabled:opacity-60"
                      disabled={isSendingText}
                    />
                    <button type="submit" disabled={!chatInput.trim() || isSendingText} className="w-8 h-8 rounded-full bg-[#3B82F6] text-white disabled:opacity-50 flex items-center justify-center flex-shrink-0 self-end mb-0.5 shadow-md">
                      {isSendingText ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5 translate-x-px" />}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modals attachés au layout fixe */}
        {patientImagePreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" onClick={() => setPatientImagePreview(null)}>
            <img src={patientImagePreview} alt="Aperçu" className="max-h-[80vh] max-w-full rounded-[20px]" />
          </div>
        )}
      </div>
    );
  }

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
                <span className="text-[10px] text-slate-400 font-semibold block">Téléconsultation</span>
                <strong className="text-[#3B82F6] font-extrabold">{(doctor.consultationFee || 5000).toLocaleString('fr-FR')} FCFA</strong>
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

            {/* 🚨 BANNIÈRE D'AVERTISSEMENT VITAL SAMU 15 */}
            <div className="p-4 rounded-[22px] bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-2 border-red-200 shadow-sm flex items-start gap-3 text-red-900">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-extrabold uppercase tracking-wide text-red-950 text-[11px] sm:text-xs">
                  Pas de prise en charge d&apos;urgence vitale
                </p>
                <p className="text-red-800 text-[11px] sm:text-xs mt-0.5">
                  En cas de détresse respiratoire, douleur thoracique, perte de connaissance ou traumatisme aigu, appelez immédiatement le <strong>15 (SAMU)</strong> ou le <strong>18 (Pompiers)</strong>.
                </p>
              </div>
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

              {/* Service Information Card */}
              <div className="p-5 rounded-[28px] border-2 border-[#3B82F6] bg-blue-50/60 shadow-md ring-4 ring-blue-500/10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-[#0F172A] flex items-center gap-1.5 text-sm sm:text-base">
                    <MessageSquare className="w-4 h-4 text-[#3B82F6]" />
                    Téléconsultation Médicale Complète
                  </span>
                  <strong className="text-[#3B82F6] font-black text-lg">
                    {selectedPrice.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Échanges interactifs sécurisés par notes vocales (audio), photos de lésions ou bilans d'analyses, et délivrance immédiate d'une ordonnance officielle certifiée avec QR code.
                </p>
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

              {/* 🛡️ Case à cocher obligatoire de Consentement Éclairé & Décharge Légale */}
              <div className="p-4 rounded-[22px] bg-slate-50/90 border border-slate-200 shadow-sm space-y-2">
                <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreedCGU}
                    onChange={e => setHasAgreedCGU(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                    required
                  />
                  <span className="leading-snug">
                    <strong className="text-red-600">Je certifie qu&apos;il ne s&apos;agit pas d&apos;une urgence vitale (SAMU 15).</strong> J&apos;accepte les{' '}
                    <button
                      type="button"
                      onClick={() => setShowCGUModal(true)}
                      className="text-blue-600 hover:text-blue-800 font-bold underline inline-flex items-center gap-0.5"
                    >
                      Conditions Générales d&apos;Utilisation
                    </button>{' '}
                    et consens à l&apos;acte de téléconsultation médicale.
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!hasAgreedCGU}
                  className={`w-full shadow-pill transition-all ${
                    !hasAgreedCGU ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
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
                  Téléconsultation ({createdPatient.amountPaid.toLocaleString('fr-FR')} FCFA)
                </span>
              </div>
            </div>

            {/* WhatsApp Direct Notification to Doctor */}
            <div className="max-w-md mx-auto pt-2">
              <a
                href={getPatientArrivalWhatsAppUrl({
                  doctorPhone: activeTransferNum,
                  doctorName: doctor.fullName,
                  patientName: createdPatient.patientName,
                  reason: createdPatient.reason,
                  consultationUrl: typeof window !== 'undefined' ? `${window.location.origin}/dr/${slug}?session=${createdPatient.id}` : `https://telemed.sn/dr/${slug}?session=${createdPatient.id}`,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block"
              >
                <GlassButton
                  type="button"
                  variant="secondary"
                  className="w-full text-xs font-bold text-emerald-800 bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Avertir le Dr sur WhatsApp</span>
                </GlassButton>
              </a>
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

      {/* 🛡️ Modal des CGU & Consentement Éclairé */}
      <CGUModal
        isOpen={showCGUModal}
        onClose={() => setShowCGUModal(false)}
        onAccept={() => setHasAgreedCGU(true)}
      />
    </div>
  );
}
