'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioVoiceNoteProps {
  audioUrl?: string;
  audioDuration?: number;
  isSender: boolean;
}

export function AudioVoiceNote({
  audioUrl,
  audioDuration = 5,
  isSender,
}: AudioVoiceNoteProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration > 0 ? audioDuration : 5);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // Synchronisation de la durée initiale
  useEffect(() => {
    if (audioDuration && audioDuration > 0) {
      setDuration(audioDuration);
    }
  }, [audioDuration]);

  // Synchronisation de la vitesse de lecture
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch {}
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Synthétiseur de tonalité vocale médicale de fallback si aucun flux audio physique
  const playSyntheticAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        // Fallback sans Web Audio : simple minuteur visuel
        setIsPlaying(true);
        synthTimerRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= duration) {
              clearInterval(synthTimerRef.current);
              setIsPlaying(false);
              return 0;
            }
            return prev + 0.25 * playbackRate;
          });
        }, 250);
        return;
      }

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      oscRef.current = osc;

      // Son doux type onde vocale médicale (280Hz modulé)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      setIsPlaying(true);

      const intervalMs = 200;
      synthTimerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + (intervalMs / 1000) * playbackRate;
          if (next >= duration) {
            clearInterval(synthTimerRef.current);
            try {
              osc.stop();
            } catch {}
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, intervalMs);
    } catch {
      setIsPlaying(false);
    }
  }, [duration, playbackRate]);

  const stopSyntheticAudio = useCallback(() => {
    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch {}
      oscRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // 1. Cas où un vrai fichier audio / DataURL est fourni
    if (audioUrl) {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.playbackRate = playbackRate;
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.warn('Lecture audio native bloquée, bascule fallback :', err);
            playSyntheticAudio();
          });
      }
      return;
    }

    // 2. Cas fallback sans audioUrl (simulation de note vocale)
    if (isPlaying) {
      stopSyntheticAudio();
    } else {
      playSyntheticAudio();
    }
  };

  const handleSpeedChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleBarClick = (index: number, totalBars: number) => {
    const targetTime = (index / totalBars) * duration;
    setCurrentTime(targetTime);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const formatTime = (secs: number) => {
    const sInt = Math.floor(secs);
    const m = Math.floor(sInt / 60);
    const s = Math.floor(sInt % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const barHeights = [40, 75, 100, 60, 90, 45, 80, 55, 70, 95, 50, 85, 65, 45];

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-[20px] select-none transition-all shadow-sm ${
        isSender
          ? 'bg-blue-600 text-white'
          : 'bg-white text-slate-800 border border-slate-200/90'
      }`}
      style={{ minWidth: '240px', maxWidth: '320px' }}
    >
      {/* Balise audio native invisible mais active */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={() => {
            if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
              setDuration(Math.round(audioRef.current.duration));
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => {
            setIsPlaying(false);
          }}
        />
      )}

      <div className="flex items-center gap-3">
        {/* Bouton Lecture / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer ${
            isSender
              ? 'bg-white text-blue-600 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={isPlaying ? 'Mettre en pause' : 'Écouter la note vocale'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Forme d'onde et défilement */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
          <div className="relative flex items-center gap-1 h-6 px-1 cursor-pointer">
            {barHeights.map((heightPct, idx) => {
              const barThreshold = (idx / barHeights.length) * 100;
              const isPast = progressPercent >= barThreshold;
              return (
                <div
                  key={idx}
                  onClick={() => handleBarClick(idx, barHeights.length)}
                  className={`flex-1 rounded-full transition-all duration-150 cursor-pointer ${
                    isPast
                      ? isSender
                        ? 'bg-white'
                        : 'bg-blue-600'
                      : isSender
                      ? 'bg-white/35'
                      : 'bg-slate-300'
                  } ${isPlaying && isPast ? 'animate-pulse' : ''}`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}

            {/* Range Scrubber bien encapsulé */}
            <input
              type="range"
              min="0"
              max={duration > 0 ? duration : 1}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Position audio"
            />
          </div>

          <div
            className={`flex items-center justify-between text-[11px] font-medium font-mono px-1 ${
              isSender ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 opacity-70" />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Vitesse de lecture (1x, 1.5x, 2x) */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors border shrink-0 cursor-pointer ${
            isSender
              ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
          title="Vitesse de lecture"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
