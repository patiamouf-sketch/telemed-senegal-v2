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
  // Détection d'un créneau 24h complet
  if (slot.start === '00:00' && (slot.end === '23:59' || slot.end === '24:00' || slot.end === '23:59:00')) {
    return true;
  }
  const start = timeStringToMinutes(slot.start);
  const end = timeStringToMinutes(slot.end);
  // Si l'heure de fin est 23:59, couvrir jusqu'à la dernière minute de la journée
  if (end >= 1439) {
    return minutes >= start && minutes <= 1440;
  }
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
  // Détection 24h/24
  const is24h = daySchedule.slots.some(
    s => s.start === '00:00' && (s.end === '23:59' || s.end === '24:00' || s.end === '23:59:00')
  );
  if (is24h) {
    return 'Ouvert 24h/24';
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
 * Moteur principal de calcul du statut de disponibilité d'un praticien (Mode direct Ouvert / Fermé)
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

  const customMessage = doctor.availability?.customMessage?.trim() || undefined;

  // 1. Fermeture explicite
  if (doctor.availableForTeleconsult === false || doctor.availability?.mode === 'closed') {
    return {
      isOpen: false,
      status: 'closed',
      label: 'Cabinet Actuellement Fermé',
      badgeVariant: 'rose',
      customMessage: customMessage || 'Le praticien n\'accepte pas de nouvelle consultation pour le moment.',
      reason: customMessage || 'Cabinet fermé par le médecin',
    };
  }

  // 2. Mode Pause temporaire
  if (doctor.availability?.mode === 'break') {
    if (doctor.availability.breakUntil) {
      const breakEndDate = new Date(doctor.availability.breakUntil);
      if (now.getTime() <= breakEndDate.getTime()) {
        const breakTimeStr = `${breakEndDate.getHours().toString().padStart(2, '0')}h${breakEndDate.getMinutes().toString().padStart(2, '0')}`;
        return {
          isOpen: false,
          status: 'break',
          label: 'Praticien en Pause',
          badgeVariant: 'amber',
          nextOpeningInfo: `Reprise prévue vers ${breakTimeStr}`,
          customMessage: customMessage || 'Le médecin prend une courte pause.',
        };
      }
    } else {
      return {
        isOpen: false,
        status: 'break',
        label: 'Praticien en Pause',
        badgeVariant: 'amber',
        customMessage: customMessage || 'Le médecin prend une courte pause.',
      };
    }
  }

  // 3. Par défaut : Cabinet Ouvert et en service
  return {
    isOpen: true,
    status: 'open',
    label: 'Cabinet Ouvert • En service',
    badgeVariant: 'emerald',
    currentSlotInfo: 'Consultations en direct disponibles',
    customMessage,
  };
}
