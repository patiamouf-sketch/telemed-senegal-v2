import { DoctorProfile, AdminStats } from '../types/doctor';
import { db, isFirebaseConfigured } from '../firebase';
import { getLocalDoctors, saveLocalDoctors, getLocalQueue } from './mockData';
import { doc, getDocs, collection, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';

/**
 * Récupère tous les médecins enregistrés (Firestore + API Serverless Cloud + LocalStorage)
 */
export async function getAllDoctors(): Promise<DoctorProfile[]> {
  const doctorMap = new Map<string, DoctorProfile>();

  // 1. Essai API Serverless (Synchronisé entre tous les appareils)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/consultation/sync?type=doctors');
      if (res.ok) {
        const data = await res.json();
        if (data.doctors && Array.isArray(data.doctors)) {
          data.doctors.forEach((d: DoctorProfile) => {
            if (d.id) doctorMap.set(d.id, d);
          });
        }
      }
    } catch (e) {}
  }

  // 2. Essai Firestore
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'doctors'));
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as DoctorProfile;
        if (data.id) doctorMap.set(data.id, data);
      });
    } catch (e) {
      console.warn('Firebase getAllDoctors notice:', e);
    }
  }

  // 3. Fallback Local Storage
  const local = getLocalDoctors();
  local.forEach(d => {
    if (d.id && !doctorMap.has(d.id)) {
      doctorMap.set(d.id, d);
    }
  });

  const combined = Array.from(doctorMap.values());
  saveLocalDoctors(combined);
  return combined;
}

export async function getPendingDoctors(): Promise<DoctorProfile[]> {
  const doctors = await getAllDoctors();
  return doctors.filter(d => d.status === 'pending');
}

export async function approveDoctor(doctorId: string): Promise<DoctorProfile | null> {
  const licenseExpiresAt = addDays(new Date(), 90).toISOString();
  const updates: Partial<DoctorProfile> = {
    status: 'active',
    licenseExpiresAt,
    rejectionReason: undefined,
  };

  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), updates);
    } catch (e) {
      console.warn('Firebase approveDoctor notice:', e);
    }
  }

  // 2. Mise à jour API Serverless Cloud
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_doctor', payload: { doctorId } })
      }).catch(e => {});
    } catch (e) {}
  }

  // 3. Mise à jour LocalStorage
  const doctors = getLocalDoctors();
  const idx = doctors.findIndex(d => d.id === doctorId);
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    return doctors[idx];
  }
  return null;
}

export async function rejectDoctor(
  doctorId: string,
  reason: string = 'Dossier incomplet ou non vérifié par l’ONMS'
): Promise<DoctorProfile | null> {
  const updates: Partial<DoctorProfile> = {
    status: 'rejected',
    rejectionReason: reason,
  };

  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), updates);
    } catch (e) {
      console.warn('Firebase rejectDoctor notice:', e);
    }
  }

  // 2. Mise à jour API Serverless Cloud
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_doctor', payload: { doctorId, reason } })
      }).catch(e => {});
    } catch (e) {}
  }

  // 3. Mise à jour LocalStorage
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
  const doctors = await getAllDoctors();
  const docProfile = doctors.find(d => d.id === doctorId);

  const currentExpiry = docProfile?.licenseExpiresAt ? new Date(docProfile.licenseExpiresAt) : new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = addDays(baseDate, days).toISOString();

  const updates: Partial<DoctorProfile> = {
    status: 'active',
    licenseExpiresAt: newExpiry,
  };

  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), updates);
    } catch (e) {
      console.warn('Firebase renewDoctorLicense notice:', e);
    }
  }

  // 2. Mise à jour API Serverless Cloud
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew_doctor_license', payload: { doctorId, days } })
      }).catch(e => {});
    } catch (e) {}
  }

  // 3. Mise à jour LocalStorage
  const localDocs = getLocalDoctors();
  const idx = localDocs.findIndex(d => d.id === doctorId);
  if (idx >= 0) {
    localDocs[idx] = { ...localDocs[idx], ...updates };
    saveLocalDoctors(localDocs);
    return localDocs[idx];
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
