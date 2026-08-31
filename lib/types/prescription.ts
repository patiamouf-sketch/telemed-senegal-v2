export interface PrescriptionItem {
  id: string;
  medication: string; // Nom DCI et Commercial (ex: "Paracétamol (Doliprane) 1g")
  ammCode?: string;   // Code AMM / ARP Sénégal (ex: "ARP-SN-2023-412")
  form: string;       // Forme (Comprimé, Sirop, Gélule, Injectable, Pommade)
  dosage: string;     // Posologie (ex: "1 comprimé 3 fois par jour après les repas")
  duration: string;   // Durée (ex: "5 jours")
  instructions?: string;
}

export interface OfficialPrescription {
  id: string;
  hash: string;            // Condensat cryptographique SHA-256 unique
  doctorId: string;
  doctorName: string;
  doctorSpeciality: string;
  doctorOnms: string;
  doctorClinic?: string;
  doctorPhone?: string;
  doctorCity?: string;
  doctorSignatureStampUrl?: string; // Tampon & signature officielle
  patientId: string;
  patientName: string;
  patientNin: string;      // NIN pour traçabilité légale
  patientAge: number;
  patientGender: 'M' | 'F';
  patientPhone: string;
  items: PrescriptionItem[];
  dietaryAdvice: string;   // Conseils Hygiéno-Diététiques (CHD)
  sealedAt: string;        // Date & Heure ISO du scellement
  verificationUrl: string; // URL vers /verify/[hash]
  status: 'valid' | 'dispensed' | 'revoked';
}
