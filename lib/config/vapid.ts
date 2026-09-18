/**
 * Configuration VAPID pour les Notifications Web Push PWA (Standard W3C)
 * Conformité Sécurité : La clé privée ne doit JAMAIS être inscrite en clair dans le code.
 */

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BDS2zIr3t9ReZhvOLcLpMsLhZG8PwZCz_37T0zJeXdFjG1nKbIR5a2K0ZRnFbANH7mr_dCmld6A1HflncyeXDQU';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:contact@telemed.sn';
