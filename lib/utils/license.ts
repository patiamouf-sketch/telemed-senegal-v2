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
      message: 'Votre dossier médical est en cours de validation par la Direction Médicale.',
    };
  }

  if (doctor.status === 'rejected') {
    return {
      isValid: false,
      isExpired: true,
      isPending: false,
      daysRemaining: 0,
      message: 'Votre demande d’adhésion a été rejetée. Contactez la Direction Générale au +221 78 106 92 98.',
    };
  }

  if (doctor.status === 'banned' || doctor.status === 'blocked') {
    return {
      isValid: false,
      isExpired: true,
      isPending: false,
      daysRemaining: 0,
      message: 'Votre compte praticien a été suspendu par la Direction Médicale de TELEMED SENEGAL. Contactez la Direction Générale au +221 78 106 92 98.',
    };
  }

  if (!doctor.licenseExpiresAt) {
    // Par défaut valide si actif (30 jours)
    return {
      isValid: true,
      isExpired: false,
      isPending: false,
      daysRemaining: 30,
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
      message: 'Votre licence a expiré. Pour régulariser votre situation, veuillez contacter la Direction Générale au +221 78 106 92 98.',
    };
  }

  return {
    isValid: true,
    isExpired: false,
    isPending: false,
    daysRemaining: Math.max(0, diffDays),
  };
}
