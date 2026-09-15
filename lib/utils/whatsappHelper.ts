/**
 * Utilitaire de formatage et de génération de liens profonds WhatsApp Direct (wa.me)
 * pour TELEMED SENEGAL.
 */

/**
 * Normalise un numéro de téléphone (Sénégal ou International) pour l'API WhatsApp
 * Exemples :
 * - "+221 77 123 45 67" -> "221771234567"
 * - "78 106 92 98" -> "221781069298"
 * - "00221765432100" -> "221765432100"
 */
export function normalizeSenegalPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.startsWith('00221')) {
    return digits.substring(2);
  }
  if (digits.startsWith('221') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `221${digits}`;
  }
  if (digits.length === 9 && (digits.startsWith('33') || digits.startsWith('30'))) {
    return `221${digits}`;
  }
  return digits;
}

/**
 * Génère une URL WhatsApp sécurisée avec texte pré-rempli
 */
export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = normalizeSenegalPhone(phone);
  const encodedText = encodeURIComponent(text.trim());
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * 1. Message envoyé par le patient au médecin pour notifier de son arrivée ou paiement
 */
export function getPatientArrivalWhatsAppUrl({
  doctorPhone,
  doctorName,
  patientName,
  reason,
  consultationUrl,
}: {
  doctorPhone: string;
  doctorName: string;
  patientName: string;
  reason?: string;
  consultationUrl: string;
}): string {
  const reasonText = reason ? `\nMotif : ${reason}` : '';
  const text = `Bonjour Dr. ${doctorName || ''},\n\nJe suis ${patientName || 'le patient'}. J'ai initié ma téléconsultation sur TELEMED SENEGAL.${reasonText}\n\nVoici le lien d'accès à mon dossier médical sécurisé :\n${consultationUrl}`;
  return createWhatsAppUrl(doctorPhone, text);
}

/**
 * 2. Message envoyé par le médecin pour inviter le patient en attente
 */
export function getDoctorInviteWhatsAppUrl({
  patientPhone,
  doctorName,
  patientName,
  consultationUrl,
}: {
  patientPhone: string;
  doctorName: string;
  patientName: string;
  consultationUrl: string;
}): string {
  const text = `Bonjour ${patientName},\n\nLe Dr. ${doctorName} est prêt à vous recevoir en téléconsultation sur TELEMED SENEGAL.\n\nVeuillez cliquer sur ce lien sécurisé pour rejoindre la consultation :\n${consultationUrl}`;
  return createWhatsAppUrl(patientPhone, text);
}

/**
 * 3. Message de transmission de l'ordonnance médicale officielle au patient
 */
export function getPrescriptionShareWhatsAppUrl({
  patientPhone,
  doctorName,
  patientName,
  rxUrl,
  hash,
}: {
  patientPhone: string;
  doctorName: string;
  patientName: string;
  rxUrl: string;
  hash?: string;
}): string {
  const hashText = hash ? `\nEmpreinte de sécurité : ${hash.substring(0, 16)}...` : '';
  const text = `Bonjour ${patientName},\n\nVoici votre ordonnance médicale officielle scellée délivrée par le Dr. ${doctorName} sur TELEMED SENEGAL.\n\nVous pouvez consulter et présenter le certificat officiel en pharmacie via ce lien :\n${rxUrl}${hashText}`;
  return createWhatsAppUrl(patientPhone, text);
}

/**
 * 4. Message de transmission de l'ordonnance par le patient à sa pharmacie
 */
export function getPharmacyShareWhatsAppUrl({
  doctorName,
  patientName,
  rxUrl,
}: {
  doctorName: string;
  patientName: string;
  rxUrl: string;
}): string {
  const text = `Bonjour,\n\nVoici mon ordonnance médicale officielle scellée (SHA-256) délivrée par le Dr. ${doctorName} pour ${patientName} sur TELEMED SENEGAL.\n\nLien de vérification et de dispensation en pharmacie :\n${rxUrl}`;
  return createWhatsAppUrl('', text);
}
