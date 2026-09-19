'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { setDoctorCabinetOpenStatus } from '@/lib/services/doctorService';
import { AvailabilityMode } from '@/lib/types/doctor';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Coffee,
  Power,
  PowerOff,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DoctorCabinetStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorCabinetStatusModal({ isOpen, onClose }: DoctorCabinetStatusModalProps) {
  const { doctorProfile, refreshProfile } = useAuth();

  const [mode, setMode] = useState<'open' | 'closed' | 'break'>('open');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [breakMinutes, setBreakMinutes] = useState<number>(30);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (doctorProfile) {
      if (doctorProfile.availableForTeleconsult === false || doctorProfile.availability?.mode === 'closed') {
        setMode('closed');
      } else if (doctorProfile.availability?.mode === 'break') {
        setMode('break');
      } else {
        setMode('open');
      }
      setCustomMessage(doctorProfile.availability?.customMessage || '');
    }
  }, [doctorProfile, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (selectedMode?: 'open' | 'closed' | 'break') => {
    if (!doctorProfile) return;
    const targetMode = selectedMode || mode;
    setSaving(true);
    setErrorMsg(null);

    try {
      let breakUntil: string | undefined = undefined;
      if (targetMode === 'break') {
        const d = new Date();
        d.setMinutes(d.getMinutes() + breakMinutes);
        breakUntil = d.toISOString();
      }

      const isOpenState = targetMode === 'open';

      await setDoctorCabinetOpenStatus(
        doctorProfile.id || doctorProfile.email,
        isOpenState,
        {
          mode: targetMode,
          customMessage: customMessage.trim(),
          breakUntil,
        }
      );

      await refreshProfile();

      setSavedSuccess(true);
      if (targetMode === 'open') {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (e) {}
      }

      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Erreur changement statut cabinet:', err);
      setErrorMsg('Une erreur est survenue lors de la mise à jour du statut.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg">
        <GlassCard className="p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200/80 bg-white/95 rounded-3xl">
          {/* Bouton de Fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* En-tête */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Power className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black text-slate-900">
                Disponibilité de votre Cabinet
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Définissez d'un simple clic si votre cabinet virtuel accepte les patients en direct.
            </p>
          </div>

          {/* Notification Succès */}
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Statut de disponibilité mis à jour avec succès !</span>
            </div>
          )}

          {/* Notification Erreur */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sélecteur des 3 États Principaux */}
          <div className="space-y-3">
            {/* OPTION 1 : OUVERT */}
            <button
              type="button"
              onClick={() => setMode('open')}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                mode === 'open'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Power className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    🟢 Cabinet Ouvert
                    {mode === 'open' && <Badge variant="emerald" className="text-[10px]">Actif</Badge>}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Les patients peuvent s'enregistrer et démarrer une consultation en direct.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                mode === 'open' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {mode === 'open' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>

            {/* OPTION 2 : FERMÉ */}
            <button
              type="button"
              onClick={() => setMode('closed')}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                mode === 'closed'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-sm'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <PowerOff className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    🔴 Cabinet Fermé
                    {mode === 'closed' && <Badge variant="rose" className="text-[10px]">Actif</Badge>}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Les nouvelles admissions sont temporairement bloquées.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                mode === 'closed' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
              }`}>
                {mode === 'closed' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>

            {/* OPTION 3 : PAUSE TEMPORAIRE */}
            <button
              type="button"
              onClick={() => setMode('break')}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                mode === 'break'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Coffee className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    ☕ Courte Pause
                    {mode === 'break' && <Badge variant="amber" className="text-[10px]">Actif</Badge>}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Pause repas, intervention rapide ou déplacement court.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                mode === 'break' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
              }`}>
                {mode === 'break' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          </div>

          {/* Options secondaires si en mode pause */}
          {mode === 'break' && (
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2 animate-fade-in">
              <span className="text-xs font-bold text-amber-950 block">Durée de la pause :</span>
              <div className="flex items-center gap-2">
                {[15, 30, 45, 60].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setBreakMinutes(mins)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      breakMinutes === mins
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message personnalisé optionnel pour les patients */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              Message d'information pour vos patients (optionnel)
            </label>
            <input
              type="text"
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              placeholder="Ex: De retour à 15h30 • En intervention chirurgicale"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Actions de validation */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className={`flex-1 py-3 rounded-2xl text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'open'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : mode === 'closed'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Appliquer le Statut'}</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
