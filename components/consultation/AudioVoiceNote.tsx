'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface AudioVoiceNoteProps {
  audioUrl?: string;
  audioDuration?: number;
  isSender: boolean;
}

export function AudioVoiceNote({
  audioUrl,
  audioDuration = 10,
  isSender,
}: AudioVoiceNoteProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioDuration && audioDuration > 0) {
      setDuration(audioDuration);
    }
  }, [audioDuration]);

  // Initialisation de l'élément audio
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => console.warn('Lecture audio bloquée :', err));
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
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-[20px] select-none transition-all ${
        isSender
          ? 'bg-blue-600/90 text-white'
          : 'bg-white text-slate-800 border border-slate-200/80 shadow-sm'
      }`}
      style={{ minWidth: '220px', maxWidth: '300px' }}
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 shadow-md ${
            isSender
              ? 'bg-white text-blue-600 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={isPlaying ? 'Mettre en pause' : 'Écouter'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Dynamic Sound Wave & Progress Bar */}
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-1 h-5 px-1">
            {[40, 75, 100, 60, 90, 45, 80, 55, 70, 95, 50, 85, 65, 40].map((heightPct, idx) => {
              const barThreshold = (idx / 14) * 100;
              const isPast = progressPercent >= barThreshold;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPast
                      ? isSender
                        ? 'bg-white'
                        : 'bg-blue-600'
                      : isSender
                      ? 'bg-white/30'
                      : 'bg-slate-300'
                  } ${isPlaying && isPast ? 'animate-pulse' : ''}`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>

          {/* Interactive Range Scrubber */}
          <input
            type="range"
            min="0"
            max={duration || 1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-transparent cursor-pointer appearance-none opacity-0 absolute"
            style={{ width: '100%' }}
          />

          <div
            className={`flex items-center justify-between text-[11px] font-medium font-mono ${
              isSender ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed button (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors border shrink-0 ${
            isSender
              ? 'bg-white/15 border-white/30 text-white hover:bg-white/25'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
          title="Modifier la vitesse de lecture"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
