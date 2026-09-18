/**
 * Module de Pseudonymisation et de Protection des Données Personnelles
 * Conformité : Commission des Données Personnelles du Sénégal (CDP - Loi n° 2008-12)
 */

/**
 * Anonymise une adresse IP (IPv4 ou IPv6) pour la journalisation d'audit
 * Ex: 196.207.215.42 -> 196.207.215.***
 */
export function anonymizeIp(ip?: string | null): string {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') {
    return '127.0.0.***';
  }

  const clean = ip.trim();

  // Traitement IPv4
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }

  // Traitement IPv6
  if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 3).join(':')}:****:****:****`;
    }
  }

  return '***.***.***.***';
}

/**
 * Masque un Numéro d'Identification Nationale (NIN) sénégalais (13 chiffres)
 * Ex: 1985031500001 -> 1985*******01
 */
export function maskNin(nin?: string | null): string {
  if (!nin) return 'N/A';
  const clean = nin.replace(/\s+/g, '').trim();
  if (clean.length < 6) return '******';
  const first = clean.slice(0, 4);
  const last = clean.slice(-2);
  return `${first}${'*'.repeat(Math.max(4, clean.length - 6))}${last}`;
}

/**
 * Masque un numéro de téléphone pour la traçabilité
 * Ex: +221 78 106 92 98 -> +221 78 *** ** 98
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return 'N/A';
  const clean = phone.trim();
  if (clean.length < 8) return '+221 ** *** **';
  const first = clean.slice(0, 7);
  const last = clean.slice(-2);
  return `${first} *** ** ${last}`;
}

/**
 * Masque une adresse email pour les logs publics
 * Ex: patient.diop@gmail.com -> p***p@gmail.com
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '***@***.sn';
  const [user, domain] = email.trim().split('@');
  if (user.length <= 2) {
    return `${user[0]}*@${domain}`;
  }
  return `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
}
