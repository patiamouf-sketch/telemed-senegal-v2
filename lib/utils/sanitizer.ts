/**
 * Module de Sécurité & Sanitisation - TELEMED SENEGAL V2
 * Protection contre les injections XSS, validation des identifiants (NIN, Phone Sénégal)
 * et assainissement des ordonnances médicales.
 */

/**
 * Supprime les balises HTML dangereuses, les scripts et les caractères de contrôle non autorisés.
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Suppression balises <script>
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Suppression balises <iframe>
    .replace(/javascript:/gi, '') // Suppression des faux protocoles JS
    .replace(/on\w+\s*=/gi, '') // Suppression des attributs événementiels (onload, onclick...)
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;')) // Échappement des chevrons restants
    .trim();
}

/**
 * Validation stricte du Numéro d'Identification Nationale (NIN sénégalais)
 * Structure officielle : 13 ou 14 chiffres numériques (ex: 1 990 10 24 00123)
 */
export function isValidSenegalNin(nin: string | undefined | null): boolean {
  if (!nin) return false;
  const clean = nin.replace(/\s+/g, '');
  // Format standard : 13 à 14 chiffres numériques
  return /^\d{13,14}$/.test(clean);
}

/**
 * Validation stricte des numéros de téléphone du Sénégal (Orange, Wave, Free, Expresso, Fixe)
 * Formats acceptés : +221 77 123 45 67, 771234567, 00221771234567, etc.
 */
export function isValidSenegalPhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-().+]/g, '');
  
  // Format international avec indicatif 221
  if (clean.startsWith('221')) {
    const local = clean.slice(3);
    return /^(7[05678]|33)\d{7}$/.test(local);
  }
  
  // Format national direct (9 chiffres, commençant par 70, 75, 76, 77, 78, 33)
  return /^(7[05678]|33)\d{7}$/.test(clean);
}

/**
 * Nettoie et formate un numéro de téléphone au format standard sénégalais (+221 XX XXX XX XX)
 */
export function formatSenegalPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  const clean = phone.replace(/[^\d]/g, '');
  let local = clean;
  if (clean.startsWith('221')) {
    local = clean.slice(3);
  }
  if (local.length === 9) {
    return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
  }
  return phone.trim();
}

/**
 * Assainit un ensemble de lignes de prescription médicale
 */
export interface SanitizeMedicationInput {
  medication: string;
  dosage: string;
  duration?: string;
  instructions?: string;
}

export function sanitizePrescriptionItems(items: SanitizeMedicationInput[]): SanitizeMedicationInput[] {
  if (!Array.isArray(items)) return [];
  
  return items.map(item => ({
    medication: sanitizeText(item.medication),
    dosage: sanitizeText(item.dosage),
    duration: item.duration ? sanitizeText(item.duration) : undefined,
    instructions: item.instructions ? sanitizeText(item.instructions) : undefined,
  }));
}
