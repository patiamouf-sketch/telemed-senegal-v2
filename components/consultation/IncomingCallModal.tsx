'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Video, PhoneCall, Volume2, VolumeX, ShieldCheck, MessageSquare } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  startIncomingCallRing,
  playCallConnectedSound,
  ensureAudioUnlocked,
  isSoundMuted,
  setSoundMuted,
  listenToSoundMuted,
} from '@/lib/utils/soundAlert';

interface IncomingCallModalProps {
  doctorName: string;
  doctorSpecialty?: string;
  doctorAvatarUrl?: string;
  doctorOnms?: string;
  onAccept: () => void;
  onDecline?: () => void;
}

export function IncomingCallModal({
  doctorName,
  doctorSpecialty = 'Médecine Générale',
  doctorAvatarUrl,
  doctorOnms,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const [muted, setMuted] = useState(false);
  const stopRingRef = useRef<(() => void) | null>(null);

  // Synchronisation de l'état silencieux
  useEffect(() => {
    setMuted(isSoundMuted());
    const unsub = listenToSoundMuted(m => setMuted(m));
    return () => unsub();
  }, []);

  // Déclenchement automatique de la sonnerie harmonique en boucle
  useEffect(() => {
    ensureAudioUnlocked();

    // Démarrer la sonnerie si non muet
    if (!muted) {
      stopRingRef.current = startIncomingCallRing();
    }

    return () => {
      if (stopRingRef.current) {
        stopRingRef.current();
        stopRingRef.current = null;
      }
    };
  }, [muted]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !muted;
    setMuted(nextMuted);
    setSoundMuted(nextMuted);

    if (nextMuted && stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    } else if (!nextMuted && !stopRingRef.current) {
      stopRingRef.current = startIncomingCallRing();
    }
  };

  const handleAcceptCall = () => {
    // 1. Couper immédiatement la sonnerie
    if (stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    }
    // 2. Jouer le carillon ascendant de connexion
    playCallConnectedSound();
    // 3. Déclencher le callback parent pour démarrer WebRTC
    onAccept();
  };

  const handleDeclineCall = () => {
    if (stopRingRef.current) {
      stopRingRef.current();
      stopRingRef.current = null;
    }
    if (onDecline) {
      onDecline();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl text-white font-sans animate-in fade-in zoom-in-95 duration-300">
      {/* Cercles radar pulsants en arrière-plan */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[320px] h-[320px] rounded-full bg-emerald-500/15 animate-ping duration-1000 opacity-60" />
        <div className="w-[450px] h-[450px] rounded-full border border-emerald-400/25 animate-pulse" />
        <div className="w-[580px] h-[580px] rounded-full border border-teal-500/15 animate-pulse delay-300" />
      </div>

      <GlassCard className="relative w-full max-w-md bg-slate-900/90 border border-emerald-500/40 shadow-2xl shadow-emerald-950/60 p-6 sm:p-8 rounded-[36px] flex flex-col items-center text-center overflow-hidden">
        {/* Bandeau supérieur : Statut & Bouton Silence rapide */}
        <div className="w-full flex items-center justify-between gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>APPEL VISIO HD ENTRANT</span>
          </div>

          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-full border transition-all ${
              muted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={muted ? 'Activer la sonnerie' : 'Couper la sonnerie'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Avatar du Médecin avec halo d'appel */}
        <div className="relative mb-5">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-400 opacity-75 blur-md animate-pulse" />
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/90 shadow-xl bg-slate-800 flex items-center justify-center">
            {doctorAvatarUrl ? (
              <img
                src={doctorAvatarUrl}
                alt={doctorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-extrabold">
                {doctorName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Informations Médicales */}
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
          {doctorName}
        </h3>
        <p className="text-sm font-semibold text-emerald-300/90 mb-2">
          {doctorSpecialty}
        </p>

        {doctorOnms && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono font-medium mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ordre des Médecins : {doctorOnms}</span>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-8 max-w-xs leading-relaxed">
          Le praticien est en ligne et prêt à vous recevoir en consultation vidéo sécurisée.
        </p>

        {/* Actions principales */}
        <div className="w-full flex flex-col gap-3">
          {/* Bouton Décrocher (Majeur) */}
          <button
            type="button"
            onClick={handleAcceptCall}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base shadow-lg shadow-emerald-500/35 hover:shadow-emerald-500/50 flex items-center justify-center gap-3 transform active:scale-98 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white animate-bounce" />
            </div>
            <span>Décrocher & Rejoindre la Visio</span>
          </button>

          {/* Actions secondaires */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={handleToggleMute}
              className="py-2.5 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              {muted ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sonnerie</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Silence</span>
                </>
              )}
            </button>

            {onDecline ? (
              <button
                type="button"
                onClick={handleDeclineCall}
                className="py-2.5 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Message</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleMute}
                className="py-2.5 px-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-teal-400" />
                <span>Visio HD 1080p</span>
              </button>
            )}
          </div>
        </div>

        {/* Badge sécurité TELEMED */}
        <div className="mt-6 text-[10px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Flux chiffré de bout en bout conforme au secret médical</span>
        </div>
      </GlassCard>
    </div>
  );
}
