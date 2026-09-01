import { DoctorProfile } from '../types/doctor';
import { differenceInDays } from 'date-fns';

/**
 * Vérifie si la licence d'exercice du praticien est active et non expirée.
 */
export function isDoctorLicenseValid(doctor?: DoctorProfile | null): {
  isValid: boolean;
  isExpired: boolean;
  isPending: boolean;
  daysRemaining: number;
  message?: string;
} {
  if (!doctor) {
    return {
      isValid: false,
      isExpired: false,
      isPending: false,
      daysRemaining: 0,
      message: 'Profil de praticien introuvable.',
    };
  }

  if (doctor.status === 'pending') {
    return {
      isValid: false,
      isExpired: false,
      isPending: true,
      daysRemaining: 0,
      message: 'Votre dossier médical est en cours de validation par la direction médicale.',
    };
  }

  if (doctor.status === 'rejected') {
    return {
      isValid: false,
      isExpired: true,
      isPending: false,
      daysRemaining: 0,
      message: 'Votre compte praticien a été rejeté ou suspendu.',
    };
  }

  if (!doctor.licenseExpiresAt) {
    // Par défaut valide si actif
    return {
      isValid: true,
      isExpired: false,
      isPending: false,
      daysRemaining: 90,
    };
  }

  const expiry = new Date(doctor.licenseExpiresAt);
  const now = new Date();
  const diffDays = differenceInDays(expiry, now);
  const isExpired = expiry.getTime() <= now.getTime();

  if (isExpired) {
    return {
      isValid: false,
      isExpired: true,
      isPending: false,
      daysRemaining: 0,
      message: `Votre licence médicale a expiré le ${expiry.toLocaleDateString('fr-FR')}. Veuillez contacter la direction médicale de Thiam Global Business pour renouvellement.`,
    };
  }

  return {
    isValid: true,
    isExpired: false,
    isPending: false,
    daysRemaining: Math.max(0, diffDays),
  };
}
