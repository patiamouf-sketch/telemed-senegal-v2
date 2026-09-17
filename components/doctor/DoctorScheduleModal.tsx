'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { updateDoctorProfile } from '@/lib/services/doctorService';
import {
  DaySchedule,
  DayOfWeek,
  AvailabilityMode,
  DoctorAvailability,
  TimeSlot,
} from '@/lib/types/doctor';
import {
  getDefaultWeeklySchedule,
  DAYS_CONFIG,
  timeStringToMinutes,
  formatDaySlots,
} from '@/lib/utils/availability';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';
import {
  Clock,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Coffee,
  AlertCircle,
  Copy,
  CalendarCheck,
  ShieldCheck,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DoctorScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorScheduleModal({ isOpen, onClose }: DoctorScheduleModalProps) {
  const { doctorProfile, refreshProfile } = useAuth();

  const [mode, setMode] = useState<AvailabilityMode>('auto');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(30);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(getDefaultWeeklySchedule());

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (doctorProfile?.availability) {
      setMode(doctorProfile.availability.mode || 'auto');
      setCustomMessage(doctorProfile.availability.customMessage || '');
      if (doctorProfile.availability.weeklySchedule?.length) {
        setWeeklySchedule(doctorProfile.availability.weeklySchedule);
      } else {
        setWeeklySchedule(getDefaultWeeklySchedule());
      }
    } else {
      setMode('auto');
      setCustomMessage('');
      setWeeklySchedule(getDefaultWeeklySchedule());
    }
  }, [doctorProfile, isOpen]);

  if (!isOpen) return null;

  // Toggle activation d'un jour
  const handleToggleDay = (day: DayOfWeek) => {
    setWeeklySchedule(prev =>
      prev.map(item => {
        if (item.day !== day) return item;
        const newEnabled = !item.enabled;
        return {
          ...item,
          enabled: newEnabled,
          slots: newEnabled && item.slots.length === 0
            ? [{ start: '08:30', end: '18:00' }]
            : item.slots,
        };
      })
    );
  };

  // Ajout d'une plage horaire pour un jour
  const handleAddSlot = (day: DayOfWeek) => {
    setWeeklySchedule(prev =>
      prev.map(item => {
        if (item.day !== day) return item;
        const lastSlot = item.slots[item.slots.length - 1];
        let defaultStart = '14:30';
        let defaultEnd = '18:00';
        if (lastSlot) {
          defaultStart = lastSlot.end;
          const endMins = Math.min(timeStringToMinutes(lastSlot.end) + 180, 23 * 60 + 59);
          const h = Math.floor(endMins / 60).toString().padStart(2, '0');
          const m = (endMins % 60).toString().padStart(2, '0');
          defaultEnd = `${h}:${m}`;
        }
        return {
          ...item,
          enabled: true,
          slots: [...item.slots, { start: defaultStart, end: defaultEnd }],
        };
      })
    );
  };

  // Suppression d'une plage horaire
  const handleRemoveSlot = (day: DayOfWeek, slotIndex: number) => {
    setWeeklySchedule(prev =>
      prev.map(item => {
        if (item.day !== day) return item;
        const newSlots = item.slots.filter((_, idx) => idx !== slotIndex);
        return {
          ...item,
          enabled: newSlots.length > 0,
          slots: newSlots,
        };
      })
    );
  };

  // Modification d'une heure de début ou fin
  const handleUpdateSlot = (
    day: DayOfWeek,
    slotIndex: number,
    field: 'start' | 'end',
    val: string
  ) => {
    setWeeklySchedule(prev =>
      prev.map(item => {
        if (item.day !== day) return item;
        const newSlots = [...item.slots];
        newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: val };
        return { ...item, slots: newSlots };
      })
    );
  };

  // Raccourci : Dupliquer le Lundi sur Lun-Ven
  const handleDuplicateMondayToWeekdays = () => {
    const monday = weeklySchedule.find(s => s.day === 'monday');
    if (!monday) return;

    setWeeklySchedule(prev =>
      prev.map(item => {
        if (['tuesday', 'wednesday', 'thursday', 'friday'].includes(item.day)) {
          return {
            ...item,
            enabled: monday.enabled,
            slots: monday.slots.map(s => ({ ...s })),
          };
        }
        return item;
      })
    );
  };

  // Raccourci : Tout régler sur 24h/24 (7j/7)
  const handleSet24_7AllDays = () => {
    setWeeklySchedule(prev =>
      prev.map(item => ({
        ...item,
        enabled: true,
        slots: [{ start: '00:00', end: '23:59' }],
      }))
    );
  };

  // Sauvegarde
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorProfile) return;

    // Validation des créneaux
    for (const dayItem of weeklySchedule) {
      if (dayItem.enabled) {
        for (const slot of dayItem.slots) {
          if (timeStringToMinutes(slot.start) >= timeStringToMinutes(slot.end)) {
            setErrorMsg(
              `Pour le ${dayItem.label}, l'heure de début (${slot.start}) doit être inférieure à l'heure de fin (${slot.end}).`
            );
            return;
          }
        }
      }
    }

    setErrorMsg(null);
    setSaving(true);

    let breakUntilIso: string | undefined = undefined;
    if (mode === 'break') {
      const untilDate = new Date(Date.now() + breakDurationMinutes * 60 * 1000);
      breakUntilIso = untilDate.toISOString();
    }

    const availabilityData: DoctorAvailability = {
      mode,
      breakUntil: breakUntilIso,
      customMessage: customMessage.trim() || undefined,
      weeklySchedule,
    };

    try {
      await updateDoctorProfile(doctorProfile.id, {
        availability: availabilityData,
        availableForTeleconsult: mode !== 'closed',
      });
      await refreshProfile();
      setSaving(false);
      setSavedSuccess(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Erreur sauvegarde horaires:', err);
      setErrorMsg('Une erreur est survenue lors de l\'enregistrement de vos horaires.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-2xl bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-scale-up max-h-[92vh]">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-white to-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                Horaires & Disponibilité
                <Badge variant="blue" size="sm">
                  Téléconsultation
                </Badge>
              </h3>
              <p className="text-xs text-slate-500">
                Définissez vos jours et tranches horaires de réception des patients
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENT (SCROLLABLE) */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Vos horaires et votre disponibilité ont été enregistrés avec succès !</span>
            </div>
          )}

          {/* SECTION 1 : STATUT EN DIRECT & MODE GLOBAL */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              1. Statut Actuel du Cabinet
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option Auto */}
              <div
                onClick={() => setMode('auto')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  mode === 'auto'
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/10'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">🟢 Mode Automatique (Recommandé)</p>
                    <p className="text-[10px] text-slate-500">Suit votre planning hebdomadaire ci-dessous</p>
                  </div>
                </div>
              </div>

              {/* Option Forcer Ouvert */}
              <div
                onClick={() => setMode('open')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  mode === 'open'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/10'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">🟢 Ouvert 24h/24 & 7j/7 (Permanence Continue)</p>
                    <p className="text-[10px] text-slate-500">Accessible en permanence jour et nuit, sans interruption</p>
                  </div>
                </div>
              </div>

              {/* Option Pause */}
              <div
                onClick={() => setMode('break')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  mode === 'break'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/10'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">⏸️ En Pause Temporaire</p>
                    <p className="text-[10px] text-slate-500">Suspend momentanément les arrivées</p>
                  </div>
                </div>
              </div>

              {/* Option Forcer Fermé */}
              <div
                onClick={() => setMode('closed')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  mode === 'closed'
                    ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/10'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">🔴 Forcer Cabinet Fermé</p>
                    <p className="text-[10px] text-slate-500">Indisponible (garde, congé, imprévu)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Détails si mode Pause */}
            {mode === 'break' && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 animate-fade-in">
                <span className="text-[11px] font-bold text-amber-900 block">
                  Durée de la pause :
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[15, 30, 45, 60, 120].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setBreakDurationMinutes(mins)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        breakDurationMinutes === mins
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {mins < 60 ? `${mins} min` : `${mins / 60} heure${mins > 60 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message personnalisé pour les patients */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Message affiché aux patients <span className="text-slate-400 font-normal">(optionnel) :</span>
              </label>
              <input
                type="text"
                placeholder="Ex: En consultation au bloc opératoire, reprise à 16h00."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* SECTION 2 : PLANNING HEBDOMADAIRE */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  2. Planning Hebdomadaire
                </label>
                <p className="text-[11px] text-slate-500">
                  Définissez vos tranches horaires par jour pour le calcul automatique
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSet24_7AllDays}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1.5 border border-emerald-200/80 transition-colors cursor-pointer shadow-xs"
                  title="Configure automatiquement tous les jours de 00:00 à 23:59 (Permanence continue)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tout en 24h/24 (7j/7)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDuplicateMondayToWeekdays}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 border border-blue-200/80 transition-colors cursor-pointer"
                  title="Copie les horaires du Lundi sur Mardi, Mercredi, Jeudi et Vendredi"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Dupliquer Lun ➜ Ven</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {DAYS_CONFIG.map(dayCfg => {
                const daySchedule = weeklySchedule.find(s => s.day === dayCfg.day);
                const isEnabled = daySchedule?.enabled || false;
                const slots = daySchedule?.slots || [];

                return (
                  <div
                    key={dayCfg.day}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isEnabled
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Jour & Switch */}
                      <div className="flex items-center gap-3 min-w-[130px]">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleDay(dayCfg.day)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <span className={`text-xs font-bold ${isEnabled ? 'text-slate-900' : 'text-slate-400'}`}>
                          {dayCfg.label}
                        </span>
                      </div>

                      {/* Plages horaires */}
                      <div className="flex-1">
                        {isEnabled ? (
                          <div className="space-y-2">
                            {slots.map((slot, idx) => (
                              <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                                  <input
                                    type="time"
                                    value={slot.start}
                                    onChange={e => handleUpdateSlot(dayCfg.day, idx, 'start', e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                  <span className="text-slate-400 text-xs">à</span>
                                  <input
                                    type="time"
                                    value={slot.end}
                                    onChange={e => handleUpdateSlot(dayCfg.day, idx, 'end', e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                                  />
                                </div>

                                {slots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSlot(dayCfg.day, idx)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Supprimer cette plage"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}

                            {/* Bouton ajouter tranche */}
                            <button
                              type="button"
                              onClick={() => handleAddSlot(dayCfg.day)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter une plage (ex: après-midi)</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Fermé toute la journée
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-md py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer mes Horaires'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
