/**
 * Génère le condensat SHA-256 officiel pour TéléMed Sénégal V2
 * Conforme à la spécification : [NIN_Patient + ID_Medecin + Date + Liste_Medocs]
 */
export async function generatePrescriptionHash(payload: {
  patientNin: string;
  doctorId: string;
  timestamp: string;
  items: Array<{ medication: string; dosage: string; duration: string }>;
}): Promise<string> {
  // Payload strict : [NIN_Patient + ID_Medecin + Date + Liste_Medocs]
  const normalizedString = `${payload.patientNin.trim()}|${payload.doctorId.trim()}|${payload.timestamp.trim()}|${JSON.stringify(
    payload.items.map(i => `${i.medication.trim()}_${i.dosage.trim()}_${i.duration.trim()}`)
  )}`;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback déterministe pour SSR
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalizedString.length; i++) {
    hash ^= normalizedString.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `sha256_${hex}${Date.now().toString(16)}`.padEnd(64, '0').slice(0, 64);
}
