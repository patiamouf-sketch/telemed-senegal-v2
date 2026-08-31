import { DoctorProfile, PatientQueueItem } from '../types/doctor';
import { OfficialPrescription } from '../types/prescription';
import { addDays } from 'date-fns';

export const INITIAL_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-active-1',
    fullName: 'Dr. Ibrahima Sow',
    email: 'ibrahima.sow@telemed.sn',
    speciality: 'Cardiologie & Médecine Interne',
    onmsNumber: 'SN-ONMS-4829',
    nin: '1988120400341',
    phone: '+221 77 654 32 10',
    waveNumber: '+221 77 654 32 10',
    omNumber: '+221 78 654 32 10',
    clinicName: 'Cabinet Médical Al-Madina',
    city: 'Dakar (Almadies)',
    slug: 'dr-sow',
    status: 'active',
    licenseExpiresAt: addDays(new Date(), 45).toISOString(),
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    consultationFee: 7000,
    avisMedicalFee: 3000,
    visioConsultationFee: 7000,
    bio: 'Ancien interne des hôpitaux de Dakar, spécialisé dans le suivi de l’hypertension artérielle et la cardiologie préventive.',
    availableForTeleconsult: true,
    rating: 4.9,
    consultationsCount: 42,
  },
  {
    id: 'doc-pending-1',
    fullName: 'Dr. Aminata Fall',
    email: 'aminata.fall@telemed.sn',
    speciality: 'Pédiatrie & Santé Maternelle',
    onmsNumber: 'SN-ONMS-7210',
    nin: '1992051200892',
    phone: '+221 78 123 45 67',
    waveNumber: '+221 78 123 45 67',
    omNumber: '+221 77 123 45 67',
    clinicName: 'Clinique de l’Enfance Teranga',
    city: 'Thiès',
    slug: 'dr-fall',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    consultationFee: 7000,
    avisMedicalFee: 3000,
    visioConsultationFee: 6000,
    bio: 'Pédiatre passionnée par la télésuivi néonatal et les conseils nutritionnels aux jeunes mamans.',
    availableForTeleconsult: true,
  },
  {
    id: 'admin-thiam-1',
    fullName: 'Dr. Cheikh Tidiane Thiam',
    email: 'dr.thiam@telemed.sn',
    speciality: 'Super-Admin & Fondateur Thiam Global Business',
    onmsNumber: 'SN-ONMS-0001',
    nin: '1980010100001',
    phone: '+221 77 000 00 00',
    waveNumber: '+221 77 000 00 00',
    omNumber: '+221 78 000 00 00',
    clinicName: 'Thiam Global Business - Direction Médicale',
    city: 'Dakar',
    slug: 'dr-thiam',
    status: 'active',
    licenseExpiresAt: addDays(new Date(), 365).toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
    consultationFee: 10000,
    avisMedicalFee: 5000,
    visioConsultationFee: 10000,
    availableForTeleconsult: true,
    rating: 5.0,
    consultationsCount: 150,
  }
];

export const INITIAL_PATIENTS_QUEUE: PatientQueueItem[] = [
  {
    id: 'pat-101',
    doctorSlug: 'dr-sow',
    patientName: 'Mamadou Diallo',
    patientNin: '1984021500321',
    patientPhone: '+221 77 432 11 00',
    age: 45,
    gender: 'M',
    serviceType: 'visio_consultation',
    amountPaid: 7000,
    paymentMethod: 'wave',
    paymentDeclared: true,
    paymentConfirmedByDoctor: true,
    reason: 'Suivi tension artérielle & avis sur bilan lipidique',
    urgency: 'suivi',
    status: 'in_consultation',
    isReadOnly: false,
    joinedAt: new Date(Date.now() - 6 * 60000).toISOString(),
    roomId: 'room-diallo-882',
    notes: 'Patient régulier Wave validé',
    messages: [
      {
        id: 'msg-1',
        sender: 'patient',
        type: 'text',
        text: 'Bonjour Dr Sow, j’ai envoyé le virement Wave de 7 000 FCFA pour notre visio.',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString()
      },
      {
        id: 'msg-2',
        sender: 'doctor',
        type: 'text',
        text: 'Bonjour M. Diallo, bien reçu. J’analyse votre dernier bilan tensionnel.',
        timestamp: new Date(Date.now() - 3 * 60000).toISOString()
      }
    ]
  },
  {
    id: 'pat-102',
    doctorSlug: 'dr-sow',
    patientName: 'Fatou Bintou Seck',
    patientNin: '1996091800654',
    patientPhone: '+221 78 888 22 11',
    age: 28,
    gender: 'F',
    serviceType: 'avis_medical',
    amountPaid: 3000,
    paymentMethod: 'orange_money',
    paymentDeclared: true,
    paymentConfirmedByDoctor: true,
    reason: 'Palpitations nocturnes légères et renouvellement traitement',
    urgency: 'normale',
    status: 'in_consultation',
    isReadOnly: false,
    joinedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    roomId: 'room-seck-419',
    messages: [
      {
        id: 'msg-3',
        sender: 'patient',
        type: 'text',
        text: 'Bonjour Docteur, j’ai ressenti des palpitations légères hier soir.',
        timestamp: new Date(Date.now() - 10 * 60000).toISOString()
      },
      {
        id: 'msg-4',
        sender: 'doctor',
        type: 'text',
        text: 'Bonjour Mme Seck. Avez-vous eu des vertiges ou un essoufflement associé ?',
        timestamp: new Date(Date.now() - 7 * 60000).toISOString()
      },
      {
        id: 'msg-5',
        sender: 'patient',
        type: 'voice',
        text: 'Note vocale (0:14s) : Précisions sur les sensations ressenties.',
        audioDuration: 14,
        timestamp: new Date(Date.now() - 4 * 60000).toISOString()
      }
    ]
  }
];

const DOCTORS_STORAGE_KEY = 'telemed_doctors_v2';
const QUEUE_STORAGE_KEY = 'telemed_queue_v2';
const ARCHIVE_STORAGE_KEY = 'telemed_archive_v2';
const PRESCRIPTIONS_STORAGE_KEY = 'telemed_prescriptions_v2';

export function getLocalDoctors(): DoctorProfile[] {
  if (typeof window === 'undefined') return INITIAL_DOCTORS;
  try {
    const raw = localStorage.getItem(DOCTORS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(INITIAL_DOCTORS));
      return INITIAL_DOCTORS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DOCTORS;
  }
}

export function saveLocalDoctors(doctors: DoctorProfile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));
  } catch (e) {
    console.error('Error saving doctors to localStorage', e);
  }
}

export function getLocalQueue(): PatientQueueItem[] {
  if (typeof window === 'undefined') return INITIAL_PATIENTS_QUEUE;
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS_QUEUE));
      return INITIAL_PATIENTS_QUEUE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PATIENTS_QUEUE;
  }
}

export function saveLocalQueue(queue: PatientQueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving queue to localStorage', e);
  }
}

export function getLocalArchive(): PatientQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalArchive(archive: PatientQueueItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archive));
  } catch (e) {
    console.error('Error saving archive to localStorage', e);
  }
}

export function getLocalPrescriptions(): OfficialPrescription[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESCRIPTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPrescriptions(prescriptions: OfficialPrescription[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(prescriptions));
  } catch (e) {
    console.error('Error saving prescriptions to localStorage', e);
  }
}
