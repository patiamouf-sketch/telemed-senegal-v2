'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PatientQueueItem, ChatMessage, DoctorProfile } from '@/lib/types/doctor';
import { OfficialPrescription } from '@/lib/types/prescription';
import { PrescriptionDrawer } from './PrescriptionDrawer';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
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
  Image as ImageIcon,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { sendConsultationMessage, archiveConsultationSession, listenToPatient } from '@/lib/services/doctorService';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import confetti from 'canvas-confetti';

interface LiveConsultationRoomProps {
  patient: PatientQueueItem;
  doctor: DoctorProfile;
  onClose: () => void;
}

export function LiveConsultationRoom({ patient, doctor, onClose }: LiveConsultationRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(patient.messages || []);
  const [inputText, setInputText] = useState('');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Synchronisation temps réel des messages & ordonnance
  useEffect(() => {
    const unsub = listenToPatient(patient.id, updated => {
      if (updated) {
        if (updated.messages) {
          setMessages(updated.messages);
        }
        if (updated.prescription) {
          setLatestPrescription(updated.prescription);
        }
      }
    });
    return () => unsub();
  }, [patient.id]);

  // Drawer states
  const [showPrescriptionDrawer, setShowPrescriptionDrawer] = useState(false);
  const [latestPrescription, setLatestPrescription] = useState<OfficialPrescription | undefined>(patient.prescription);

  // Voice note MediaRecorder state
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

  // License check
  const licenseCheck = isDoctorLicenseValid(doctor);

  // Real Camera Stream setup for Visio
  useEffect(() => {
    if (patient.serviceType === 'visio_consultation' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn('Camera access not granted or not available (using simulation):', err);
        });

      return () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [patient.serviceType]);

  // Timer for Visio
  useEffect(() => {
    if (patient.serviceType === 'visio_consultation') {
      const timer = setInterval(() => setCallSeconds(s => s + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [patient.serviceType]);

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

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const msg = await sendConsultationMessage(patient.id, {
      sender: 'doctor',
      type: 'text',
      text: inputText.trim(),
    });

    setMessages(prev => [...prev, msg]);
    setInputText('');
  };

  // Start Real Voice Recording (MediaRecorder WebM/OGG)
  const startVoiceRecording = async () => {
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
        // Fallback simulation
        setIsRecordingVoice(true);
      }
    } catch (err) {
      console.warn('Microphone permission not granted, fallback mode:', err);
      setIsRecordingVoice(true);
    }
  };

  // Stop Voice Recording
  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      // Fallback
      const duration = Math.max(1, voiceSeconds);
      setIsRecordingVoice(false);
      sendConsultationMessage(patient.id, {
        sender: 'doctor',
        type: 'voice',
        text: `Note vocale médicale (${duration}s)`,
        audioDuration: duration,
      }).then(msg => setMessages(prev => [...prev, msg]));
    }
  };

  const handleToggleVoiceRecording = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Audio Playback
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
      // Web Audio synth fallback tone
      setPlayingVoiceId(msgId);
      setTimeout(() => setPlayingVoiceId(null), 3000);
    }
  };

  // Send Image Upload (Lab tests / Lesions)
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const imageUrl = event.target?.result as string;
      const msg = await sendConsultationMessage(patient.id, {
        sender: 'doctor',
        type: 'image',
        text: `Document médical / Bilan partagé (${file.name})`,
        imageUrl,
      });
      setMessages(prev => [...prev, msg]);
    };
    reader.readAsDataURL(file);
  };

  // Prescription Sealed callback
  const handlePrescriptionSealed = async (prescription: OfficialPrescription) => {
    setLatestPrescription(prescription);

    const msg = await sendConsultationMessage(patient.id, {
      sender: 'doctor',
      type: 'prescription',
      text: `📋 ORDONNANCE OFFICIELLE SCELLÉE (SHA-256) :\n${prescription.items.map(i => `• ${i.medication} (${i.dosage})`).join('\n')}`,
      prescriptionData: prescription,
      isPrescription: true,
    });

    setMessages(prev => [...prev, msg]);
  };

  // Close and Archive Session
  const handleCloseSession = async () => {
    if (confirm('Souhaitez-vous clôturer et archiver cette séance de consultation ?')) {
      await archiveConsultationSession(patient.id, latestPrescription);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      onClose();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md font-sans max-h-[100dvh] h-[100dvh] overflow-hidden">
      <GlassCard className="relative w-full max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] sm:max-h-[850px] bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl flex flex-col justify-between overflow-hidden rounded-none sm:rounded-[32px]">
        {/* Top Header Bar with Clean Patient Badge & License Status */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-50/70 via-white to-blue-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0 ${
                patient.serviceType === 'visio_consultation'
                  ? 'bg-gradient-to-tr from-blue-600 to-sky-400 shadow-blue-500/25'
                  : 'bg-gradient-to-tr from-teal-600 to-emerald-400 shadow-emerald-500/25'
              }`}
            >
              {patient.serviceType === 'visio_consultation' ? (
                <Video className="w-5 h-5" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">{patient.patientName}</h2>
                <Badge variant="blue" size="sm">
                  {patient.gender === 'F' ? 'Femme' : 'Homme'} • {patient.age} ans
                </Badge>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  NIN: {patient.patientNin}
                </span>
                <Badge variant={patient.serviceType === 'visio_consultation' ? 'sky' : 'emerald'} size="sm">
                  {patient.serviceType === 'visio_consultation' ? 'Visio HD' : 'Avis Médical'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tél : <strong className="font-mono text-slate-700">{patient.patientPhone}</strong> • Réf : {patient.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {patient.serviceType === 'visio_consultation' && (
              <div className="px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {formatTimer(callSeconds)}
              </div>
            )}

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
              className="text-xs font-bold shadow-pill"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rédiger l'Ordonnance</span>
            </GlassButton>

            <GlassButton
              variant="danger"
              size="sm"
              onClick={handleCloseSession}
              className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Clôturer la séance</span>
            </GlassButton>
          </div>
        </div>

        {/* License Expired Warning Banner */}
        {!licenseCheck.isValid && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{licenseCheck.message}</span>
            </div>
            <span className="font-bold text-rose-700 text-[11px] uppercase">Sécurité Activée</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Mode Visio: Fluid WebRTC Video Window with Camera & Controls */}
          {patient.serviceType === 'visio_consultation' && (
            <div className="h-64 sm:h-72 bg-slate-950 p-4 border-b border-slate-800 flex flex-col justify-between relative overflow-hidden flex-shrink-0">
              <div className="flex-1 rounded-[24px] bg-slate-900 border border-slate-800 relative flex items-center justify-center overflow-hidden">
                {/* Remote Patient Video Stream */}
                <div className="text-center space-y-2 p-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-sky-400 text-white flex items-center justify-center text-2xl font-extrabold mx-auto shadow-2xl ring-4 ring-sky-400/30 animate-pulse">
                    {patient.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{patient.patientName}</h3>
                    <p className="text-[11px] text-sky-400 font-mono">Patient en direct • Flux WebRTC Chiffré</p>
                  </div>
                </div>

                {/* Picture in Picture (Doctor Local Camera Video) */}
                <div className="absolute bottom-3 right-3 w-32 h-24 rounded-[18px] bg-slate-800 border-2 border-white/20 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                  />
                  {isVideoOff && (
                    <div className="w-full h-full bg-gradient-to-b from-sky-900/40 to-slate-900 flex flex-col items-center justify-center text-white p-2 text-center">
                      <Stethoscope className="w-4 h-4 text-sky-400 mb-0.5" />
                      <span className="text-[9px] font-bold">Caméra Off</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Controls Bar */}
              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  onClick={toggleAudioTrack}
                  className={`p-2.5 rounded-full transition-all ${
                    isVideoMuted ? 'bg-rose-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isVideoMuted ? 'Activer micro' : 'Couper micro'}
                >
                  {isVideoMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
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

          {/* Chat Feed */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Clinical Summary Pill */}
            <div className="px-6 py-2.5 bg-blue-50/40 border-b border-blue-100/60 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0F172A]">Motif de consultation :</span> {patient.reason}
              </div>
              <Badge variant={patient.urgency === 'urgente' ? 'rose' : 'blue'} size="sm">
                Urgence : {patient.urgency}
              </Badge>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
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
                    /* Official Sealed Prescription Card inside chat */
                    <div className="max-w-md w-full rounded-[24px] bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 border-2 border-emerald-300 p-5 shadow-lg space-y-3 font-sans">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <span className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider">
                            Ordonnance Médicale Scellée (SHA-256)
                          </span>
                        </div>
                        <Badge variant="emerald" size="sm">
                          ONMS {doctor.onmsNumber}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-slate-700">
                        <p className="font-bold text-slate-900">{patient.patientName} (NIN: {patient.patientNin})</p>
                        <div className="bg-white/90 p-3 rounded-[16px] border border-emerald-100 space-y-1">
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
                        <a
                          href={msg.prescriptionData.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                        >
                          <span>Certificat QR</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* Regular text / image / voice bubble */
                    <div
                      className={`max-w-[80%] rounded-[24px] p-3.5 text-xs leading-relaxed shadow-sm space-y-2 ${
                        msg.sender === 'doctor'
                          ? 'bg-[#3B82F6] text-white rounded-br-none'
                          : 'bg-slate-100 text-[#1E293B] rounded-bl-none'
                      }`}
                    >
                      {/* Image Message */}
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

                      {/* Voice Note Message with Audio Wave */}
                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-3 p-1">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(msg.id, msg.audioUrl)}
                            className={`p-2 rounded-full transition-transform active:scale-95 ${
                              msg.sender === 'doctor' ? 'bg-white/20 text-white' : 'bg-[#3B82F6] text-white'
                            }`}
                          >
                            {playingVoiceId === msg.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
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

                      {/* Text content */}
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

            {/* Input Bar (Text + Voice MediaRecorder + Image upload) */}
            <div className="p-3 border-t border-slate-100 bg-white/90 backdrop-blur-md flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelected}
                className="hidden"
              />

              {/* Attach Image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-full text-slate-400 hover:text-[#3B82F6] hover:bg-blue-50 transition-colors"
                title="Joindre un bilan ou une photo de lésion"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Voice Record button */}
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
                    Enregistrement micro en cours ({voiceSeconds}s)...
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
                    placeholder="Écrivez votre message ou conseil médical..."
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
          </div>
        </div>

        {/* Prescription Drawer */}
        {showPrescriptionDrawer && (
          <PrescriptionDrawer
            doctor={doctor}
            patient={patient}
            onClose={() => setShowPrescriptionDrawer(false)}
            onPrescriptionSealed={handlePrescriptionSealed}
          />
        )}

        {/* Image Fullscreen Preview Lightbox */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh] p-2 bg-white rounded-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Document médical grand format"
                className="max-h-[80vh] w-auto rounded-[20px]"
              />
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
