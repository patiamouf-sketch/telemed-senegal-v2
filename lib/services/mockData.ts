import { DoctorProfile, PatientQueueItem } from '../types/doctor';
import { OfficialPrescription } from '../types/prescription';
import { addDays } from 'date-fns';

export const INITIAL_DOCTORS: DoctorProfile[] = [];

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
