import {
  DoctorProfile,
  DoctorAvailability,
  DaySchedule,
  DayOfWeek,
  TimeSlot,
  AvailabilityStatusResult,
} from '../types/doctor';

export const DAYS_CONFIG: { day: DayOfWeek; label: string; jsIndex: number }[] = [
  { day: 'monday', label: 'Lundi', jsIndex: 1 },
  { day: 'tuesday', label: 'Mardi', jsIndex: 2 },
  { day: 'wednesday', label: 'Mercredi', jsIndex: 3 },
  { day: 'thursday', label: 'Jeudi', jsIndex: 4 },
  { day: 'friday', label: 'Vendredi', jsIndex: 5 },
  { day: 'saturday', label: 'Samedi', jsIndex: 6 },
  { day: 'sunday', label: 'Dimanche', jsIndex: 0 },
];

/**
 * Retourne le planning hebdomadaire par défaut pour un praticien au Sénégal
 * Lun-Ven: 08h30-13h00 & 14h30-18h00
 * Sam: 09h00-13h00
 * Dim: Fermé
 */
export function getDefaultWeeklySchedule(): DaySchedule[] {
  return [
    {
      day: 'monday',
      label: 'Lundi',
      enabled: true,
      slots: [
        { start: '08:30', end: '13:00' },
        { start: '14:30', end: '18:00' },
      ],
    },
    {
      day: 'tuesday',
      label: 'Mardi',
      enabled: true,
      slots: [
        { start: '08:30', end: '13:00' },
        { start: '14:30', end: '18:00' },
      ],
    },
    {
      day: 'wednesday',
      label: 'Mercredi',
      enabled: true,
      slots: [
        { start: '08:30', end: '13:00' },
        { start: '14:30', end: '18:00' },
      ],
    },
    {
      day: 'thursday',
      label: 'Jeudi',
      enabled: true,
      slots: [
        { start: '08:30', end: '13:00' },
        { start: '14:30', end: '18:00' },
      ],
    },
    {
      day: 'friday',
      label: 'Vendredi',
      enabled: true,
      slots: [
        { start: '08:30', end: '13:00' },
        { start: '14:30', end: '18:00' },
      ],
    },
    {
      day: 'saturday',
      label: 'Samedi',
      enabled: true,
      slots: [{ start: '09:00', end: '13:00' }],
    },
    {
      day: 'sunday',
      label: 'Dimanche',
      enabled: false,
      slots: [],
    },
  ];
}

/**
 * Convertit un horaire "HH:mm" en minutes depuis minuit pour comparaisons strictes
 */
export function timeStringToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Vérifie si une heure donnée (en minutes) est dans une plage horaire
 */
export function isMinutesInSlot(minutes: number, slot: TimeSlot): boolean {
  const start = timeStringToMinutes(slot.start);
  const end = timeStringToMinutes(slot.end);
  return minutes >= start && minutes < end;
}

/**
 * Formate l'affichage lisible des plages d'un jour
 * Ex: "08:30 - 13:00, 14:30 - 18:00" ou "Fermé"
 */
export function formatDaySlots(daySchedule?: DaySchedule): string {
  if (!daySchedule || !daySchedule.enabled || daySchedule.slots.length === 0) {
    return 'Fermé';
  }
  return daySchedule.slots
    .map(s => `${s.start} - ${s.end}`)
    .join(' • ');
}

/**
 * Trouve le prochain créneau d'ouverture à partir d'une date/heure donnée
 */
export function findNextOpening(
  weeklySchedule: DaySchedule[],
  now: Date
): string | undefined {
  if (!weeklySchedule || weeklySchedule.length === 0) return undefined;

  const currentJsDay = now.getDay(); // 0 = Dimanche, 1 = Lundi, ...
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Ordonner les jours en partant d'aujourd'hui jusqu'à J+7
  for (let offset = 0; offset < 7; offset++) {
    const targetJsDay = (currentJsDay + offset) % 7;
    const dayConfig = DAYS_CONFIG.find(d => d.jsIndex === targetJsDay);
    if (!dayConfig) continue;

    const daySchedule = weeklySchedule.find(s => s.day === dayConfig.day);
    if (!daySchedule || !daySchedule.enabled || daySchedule.slots.length === 0) {
      continue;
    }

    // Trier les plages du jour
    const sortedSlots = [...daySchedule.slots].sort(
      (a, b) => timeStringToMinutes(a.start) - timeStringToMinutes(b.start)
    );

    for (const slot of sortedSlots) {
      const slotStartMinutes = timeStringToMinutes(slot.start);

      // Si c'est aujourd'hui, le créneau doit démarrer après l'heure courante
      if (offset === 0) {
        if (slotStartMinutes > currentMinutes) {
          return `Aujourd'hui à ${slot.start}`;
        }
      } else if (offset === 1) {
        return `Demain (${dayConfig.label}) à ${slot.start}`;
      } else {
        return `${dayConfig.label} à ${slot.start}`;
      }
    }
  }

  return undefined;
}

/**
 * Moteur principal de calcul du statut de disponibilité d'un praticien
 */
export function getDoctorAvailabilityStatus(
  doctor: DoctorProfile | null,
  now: Date = new Date()
): AvailabilityStatusResult {
  if (!doctor) {
    return {
      isOpen: false,
      status: 'closed',
      label: 'Cabinet Indisponible',
      badgeVariant: 'rose',
      reason: 'Profil médecin introuvable',
    };
  }

  // Compatibilité rétroactive : si le médecin a explicitement désactivé availableForTeleconsult
  if (doctor.availableForTeleconsult === false) {
    return {
      isOpen: false,
      status: 'closed',
      label: 'Cabinet Fermé',
      badgeVariant: 'rose',
      reason: 'Téléconsultation momentanément désactivée',
    };
  }

  const availability: DoctorAvailability = doctor.availability || {
    mode: 'auto',
    weeklySchedule: getDefaultWeeklySchedule(),
  };

  const weeklySchedule = availability.weeklySchedule?.length
    ? availability.weeklySchedule
    : getDefaultWeeklySchedule();

  const customMessage = availability.customMessage?.trim() || undefined;

  // 1. Mode Forcé Ouvert
  if (availability.mode === 'open') {
    return {
      isOpen: true,
      status: 'open',
      label: 'Cabinet Ouvert • En direct',
      badgeVariant: 'emerald',
      customMessage,
    };
  }

  // 2. Mode Forcé Fermé
  if (availability.mode === 'closed') {
    const nextOpening = findNextOpening(weeklySchedule, now);
    return {
      isOpen: false,
      status: 'closed',
      label: 'Cabinet Actuellement Fermé',
      badgeVariant: 'rose',
      nextOpeningInfo: nextOpening ? `Réouverture prévue : ${nextOpening}` : undefined,
      customMessage: customMessage || 'Le praticien n\'accepte pas de nouvelle consultation pour le moment.',
    };
  }

  // 3. Mode Pause
  if (availability.mode === 'break') {
    // Vérifier si une heure de fin est précisée et si elle est dépassée
    if (availability.breakUntil) {
      const breakEndDate = new Date(availability.breakUntil);
      if (now.getTime() > breakEndDate.getTime()) {
        // La pause est terminée, on évalue selon le mode auto
      } else {
        const breakTimeStr = `${breakEndDate.getHours().toString().padStart(2, '0')}h${breakEndDate.getMinutes().toString().padStart(2, '0')}`;
        return {
          isOpen: false,
          status: 'break',
          label: 'Praticien en Pause',
          badgeVariant: 'amber',
          nextOpeningInfo: `Reprise prévue à ${breakTimeStr}`,
          customMessage: customMessage || 'Le médecin prend une courte pause entre deux consultations.',
        };
      }
    } else {
      return {
        isOpen: false,
        status: 'break',
        label: 'Praticien en Pause',
        badgeVariant: 'amber',
        customMessage: customMessage || 'Le médecin est momentanément indisponible.',
      };
    }
  }

  // 4. Mode Automatique selon le planning hebdomadaire
  const currentJsDay = now.getDay();
  const dayConfig = DAYS_CONFIG.find(d => d.jsIndex === currentJsDay);
  const currentDaySchedule = dayConfig
    ? weeklySchedule.find(s => s.day === dayConfig.day)
    : undefined;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (currentDaySchedule && currentDaySchedule.enabled && currentDaySchedule.slots.length > 0) {
    const activeSlot = currentDaySchedule.slots.find(slot =>
      isMinutesInSlot(currentMinutes, slot)
    );

    if (activeSlot) {
      return {
        isOpen: true,
        status: 'open',
        label: 'Cabinet Ouvert • En service',
        badgeVariant: 'emerald',
        currentSlotInfo: `Plage de consultation : ${activeSlot.start} - ${activeSlot.end}`,
        customMessage,
      };
    }
  }

  // Si en dehors des plages d'ouverture
  const nextOpening = findNextOpening(weeklySchedule, now);

  return {
    isOpen: false,
    status: 'closed',
    label: 'Cabinet Actuellement Fermé',
    badgeVariant: 'rose',
    nextOpeningInfo: nextOpening ? `Réouverture : ${nextOpening}` : undefined,
    customMessage: customMessage || 'En dehors des horaires de consultation.',
  };
}
