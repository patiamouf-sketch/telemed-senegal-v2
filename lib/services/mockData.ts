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

let memoryDoctors: DoctorProfile[] | null = null;
let memoryQueue: PatientQueueItem[] | null = null;
let memoryArchive: PatientQueueItem[] | null = null;
let memoryPrescriptions: OfficialPrescription[] | null = null;

let saveQueueTimer: any = null;
let saveArchiveTimer: any = null;
let saveDoctorsTimer: any = null;
let savePrescriptionsTimer: any = null;

// Écoute des synchronisations inter-onglets
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DOCTORS_STORAGE_KEY) memoryDoctors = null;
    if (e.key === QUEUE_STORAGE_KEY) memoryQueue = null;
    if (e.key === ARCHIVE_STORAGE_KEY) memoryArchive = null;
    if (e.key === PRESCRIPTIONS_STORAGE_KEY) memoryPrescriptions = null;
  });
}

export function getLocalDoctors(): DoctorProfile[] {
  if (memoryDoctors) return memoryDoctors;
  if (typeof window === 'undefined') return INITIAL_DOCTORS;
  try {
    const raw = localStorage.getItem(DOCTORS_STORAGE_KEY);
    if (!raw) {
      memoryDoctors = INITIAL_DOCTORS;
      localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(INITIAL_DOCTORS));
      return INITIAL_DOCTORS;
    }
    memoryDoctors = JSON.parse(raw);
    return memoryDoctors || INITIAL_DOCTORS;
  } catch {
    return INITIAL_DOCTORS;
  }
}

export function saveLocalDoctors(doctors: DoctorProfile[]) {
  memoryDoctors = doctors;
  if (typeof window === 'undefined') return;
  
  if (saveDoctorsTimer) clearTimeout(saveDoctorsTimer);
  saveDoctorsTimer = setTimeout(() => {
    try {
      localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));
    } catch (e) {
      console.warn('Notice écriture localStorage doctors:', e);
    }
  }, 50);
}

export function getLocalQueue(): PatientQueueItem[] {
  if (memoryQueue) return memoryQueue;
  if (typeof window === 'undefined') return INITIAL_PATIENTS_QUEUE;
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) {
      memoryQueue = INITIAL_PATIENTS_QUEUE;
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS_QUEUE));
      return INITIAL_PATIENTS_QUEUE;
    }
    memoryQueue = JSON.parse(raw);
    return memoryQueue || INITIAL_PATIENTS_QUEUE;
  } catch {
    return INITIAL_PATIENTS_QUEUE;
  }
}

export function saveLocalQueue(queue: PatientQueueItem[]) {
  memoryQueue = queue;
  if (typeof window === 'undefined') return;
  
  if (saveQueueTimer) clearTimeout(saveQueueTimer);
  saveQueueTimer = setTimeout(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Notice écriture localStorage queue:', e);
    }
  }, 50);
}

export function getLocalArchive(): PatientQueueItem[] {
  if (memoryArchive) return memoryArchive;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    memoryArchive = raw ? JSON.parse(raw) : [];
    return memoryArchive || [];
  } catch {
    return [];
  }
}

export function saveLocalArchive(archive: PatientQueueItem[]) {
  memoryArchive = archive;
  if (typeof window === 'undefined') return;
  
  if (saveArchiveTimer) clearTimeout(saveArchiveTimer);
  saveArchiveTimer = setTimeout(() => {
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archive));
    } catch (e) {
      console.warn('Notice écriture localStorage archive:', e);
    }
  }, 100);
}

export function getLocalPrescriptions(): OfficialPrescription[] {
  if (memoryPrescriptions) return memoryPrescriptions;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESCRIPTIONS_STORAGE_KEY);
    memoryPrescriptions = raw ? JSON.parse(raw) : [];
    return memoryPrescriptions || [];
  } catch {
    return [];
  }
}

export function saveLocalPrescriptions(prescriptions: OfficialPrescription[]) {
  memoryPrescriptions = prescriptions;
  if (typeof window === 'undefined') return;
  
  if (savePrescriptionsTimer) clearTimeout(savePrescriptionsTimer);
  savePrescriptionsTimer = setTimeout(() => {
    try {
      localStorage.setItem(PRESCRIPTIONS_STORAGE_KEY, JSON.stringify(prescriptions));
    } catch (e) {
      console.warn('Notice écriture localStorage prescriptions:', e);
    }
  }, 100);
}
