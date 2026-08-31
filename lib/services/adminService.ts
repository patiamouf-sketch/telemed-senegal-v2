import { DoctorProfile, AdminStats } from '../types/doctor';
import { db, isFirebaseConfigured } from '../firebase';
import { getLocalDoctors, saveLocalDoctors, getLocalQueue } from './mockData';
import { doc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { addDays } from 'date-fns';

export async function getAllDoctors(): Promise<DoctorProfile[]> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'doctors'));
      return snap.docs.map(d => d.data() as DoctorProfile);
    } catch (e) {
      console.warn('Firebase getAllDoctors failed, using local storage:', e);
    }
  }

  return getLocalDoctors();
}

export async function getPendingDoctors(): Promise<DoctorProfile[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'doctors'), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as DoctorProfile);
    } catch (e) {
      console.warn('Firebase getPendingDoctors failed, using local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  return doctors.filter(d => d.status === 'pending');
}

export async function approveDoctor(doctorId: string): Promise<DoctorProfile | null> {
  const licenseExpiresAt = addDays(new Date(), 90).toISOString();
  const updates: Partial<DoctorProfile> = {
    status: 'active',
    licenseExpiresAt,
    rejectionReason: undefined,
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), updates);
    } catch (e) {
      console.warn('Firebase approveDoctor failed, updating local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    return doctors[idx];
  }
  return null;
}

export async function rejectDoctor(doctorId: string, reason: string = 'Dossier incomplet ou non vérifié par l’ONMS'): Promise<DoctorProfile | null> {
  const updates: Partial<DoctorProfile> = {
    status: 'rejected',
    rejectionReason: reason,
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), updates);
    } catch (e) {
      console.warn('Firebase rejectDoctor failed, updating local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    return doctors[idx];
  }
  return null;
}

export async function renewDoctorLicense(doctorId: string, days: number = 90): Promise<DoctorProfile | null> {
  const doctors = getLocalDoctors();
  const docProfile = doctors.find(d => d.id === doctorId);
  
  const currentExpiry = docProfile?.licenseExpiresAt ? new Date(docProfile.licenseExpiresAt) : new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = addDays(baseDate, days).toISOString();

  const updates: Partial<DoctorProfile> = {
    status: 'active',
    licenseExpiresAt: newExpiry,
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), updates);
    } catch (e) {
      console.warn('Firebase renewDoctorLicense failed, updating local storage:', e);
    }
  }

  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    return doctors[idx];
  }
  return null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const doctors = await getAllDoctors();
  const queue = getLocalQueue();

  return {
    totalDoctors: doctors.length,
    pendingCount: doctors.filter(d => d.status === 'pending').length,
    activeCount: doctors.filter(d => d.status === 'active').length,
    rejectedCount: doctors.filter(d => d.status === 'rejected').length,
    activePatientsToday: queue.length,
  };
}
