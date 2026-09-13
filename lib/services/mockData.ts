import { DoctorProfile, PatientQueueItem } from '../types/doctor';
import { OfficialPrescription } from '../types/prescription';
import { addDays } from 'date-fns';

export const INITIAL_DOCTORS: DoctorProfile[] = [
  {
    id: 'admin-thiam-1',
    fullName: 'Dr. Elhadji Pathé THIAM',
    email: 'pati.amouf@gmail.com',
    phone: '+221 78 106 92 98',
    nin: '1985031500001',
    speciality: 'Médecine Générale',
    onmsNumber: '',
    clinicName: 'Cabinet Médical Virtuel TELEMED SENEGAL',
    city: 'Dakar',
    consultationFee: 15000,
    avisMedicalFee: 5000,
    visioConsultationFee: 15000,
    availableForTeleconsult: true,
    slug: 'dr-elhadji-pathe-thiam',
    status: 'active',
    role: 'admin',
    licenseExpiresAt: '2099-12-31T23:59:59.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
  }
];

export const INITIAL_PATIENTS_QUEUE: PatientQueueItem[] = [];

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
