import { DoctorProfile, AdminStats } from '../types/doctor';
import { db, isFirebaseConfigured } from '../firebase';
import { getLocalDoctors, saveLocalDoctors, getLocalQueue } from './mockData';
import { doc, getDocs, collection, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { addDays } from 'date-fns';

function mergeDoctorRecord(existing: DoctorProfile | undefined, incoming: DoctorProfile): DoctorProfile {
  if (!existing) return incoming;
  // RÈGLE DE SÉCURITÉ ABSOLUE : Un statut 'active' ou 'rejected' validé ne peut JAMAIS être rétrogradé en 'pending' par un cache périmé
  const finalStatus = (existing.status === 'active' || incoming.status === 'active')
    ? 'active'
    : (existing.status === 'rejected' || incoming.status === 'rejected')
      ? 'rejected'
      : incoming.status || existing.status || 'pending';

  const finalLicense = (existing.status === 'active' ? existing.licenseExpiresAt : incoming.licenseExpiresAt) ||
    incoming.licenseExpiresAt || existing.licenseExpiresAt;

  return {
    ...existing,
    ...incoming,
    status: finalStatus,
    licenseExpiresAt: finalLicense,
  };
}

/**
 * Récupère tous les médecins enregistrés (Firestore + API Serverless Cloud + LocalStorage)
 */
export async function getAllDoctors(): Promise<DoctorProfile[]> {
  const emailMap = new Map<string, DoctorProfile>();

  // 1. PRIORITÉ ABSOLUE N°1 : FIRESTORE DATABASE
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'doctors'));
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as DoctorProfile;
        const key = data.email ? data.email.toLowerCase().trim() : data.id;
        if (key) {
          emailMap.set(key, mergeDoctorRecord(emailMap.get(key), data));
        }
      });
    } catch (e) {
      console.warn('Firebase getAllDoctors notice:', e);
    }
  }

  // 2. PRIORITÉ N°2 : Local Storage
  const local = getLocalDoctors();
  local.forEach(d => {
    const key = d.email ? d.email.toLowerCase().trim() : d.id;
    if (key) {
      emailMap.set(key, mergeDoctorRecord(emailMap.get(key), d));
    }
  });

  // 3. PRIORITÉ N°3 : API Serverless Cloud
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/consultation/sync?type=doctors');
      if (res.ok) {
        const data = await res.json();
        if (data.doctors && Array.isArray(data.doctors)) {
          data.doctors.forEach((d: DoctorProfile) => {
            const key = d.email ? d.email.toLowerCase().trim() : d.id;
            if (key) {
              emailMap.set(key, mergeDoctorRecord(emailMap.get(key), d));
            }
          });
        }
      }
    } catch (e) {}
  }

  const combined = Array.from(emailMap.values());
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

  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  const localDocs = getLocalDoctors();
  const target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower);
  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');

  // 1. Mise à jour LocalStorage et Session immédiate
  let updatedDoc: DoctorProfile | null = null;
  const updatedList = localDocs.map(d => {
    if (d.id === targetId || (targetEmail && d.email.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      return up;
    }
    return d;
  });
  if (updatedDoc) {
    saveLocalDoctors(updatedList);
  }

  if (typeof window !== 'undefined') {
    try {
      const savedSession = localStorage.getItem('telemed_session_v2');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (
          parsed.profile?.id === targetId ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore Directe (AWAIT TOTAL)
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'doctors', targetId), updates, { merge: true });

      if (targetEmail) {
        await setDoc(doc(db, 'doctors', targetEmail), updates, { merge: true });
        const q = query(collection(db, 'doctors'), where('email', '==', targetEmail));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(dSnap => setDoc(dSnap.ref, updates, { merge: true })));
      }
    } catch (e) {
      console.warn('Firebase approveDoctor notice:', e);
    }
  }

  // 3. Mise à jour API Serverless Cloud (AWAIT TOTAL)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_doctor', payload: { doctorId: targetId, email: targetEmail } })
      });
    } catch (e) {}
  }

  return updatedDoc;
}

export async function rejectDoctor(
  doctorId: string,
  reason: string = 'Dossier incomplet ou non vérifié par l’ONMS'
): Promise<DoctorProfile | null> {
  const updates: Partial<DoctorProfile> = {
    status: 'rejected',
    rejectionReason: reason,
  };

  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  const localDocs = getLocalDoctors();
  const target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower);
  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');

  // 1. Mise à jour LocalStorage et Session
  let updatedDoc: DoctorProfile | null = null;
  const updatedList = localDocs.map(d => {
    if (d.id === targetId || (targetEmail && d.email.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      return up;
    }
    return d;
  });
  if (updatedDoc) {
    saveLocalDoctors(updatedList);
  }

  if (typeof window !== 'undefined') {
    try {
      const savedSession = localStorage.getItem('telemed_session_v2');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (
          parsed.profile?.id === targetId ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore (AWAIT TOTAL)
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'doctors', targetId), updates, { merge: true });
      if (targetEmail) {
        await setDoc(doc(db, 'doctors', targetEmail), updates, { merge: true });
        const q = query(collection(db, 'doctors'), where('email', '==', targetEmail));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(dSnap => setDoc(dSnap.ref, updates, { merge: true })));
      }
    } catch (e) {
      console.warn('Firebase rejectDoctor notice:', e);
    }
  }

  // 3. Mise à jour API Serverless Cloud (AWAIT TOTAL)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_doctor', payload: { doctorId: targetId, email: targetEmail, reason } })
      });
    } catch (e) {}
  }

  return updatedDoc;
}

export async function renewDoctorLicense(doctorId: string, days: number = 90): Promise<DoctorProfile | null> {
  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  const localDocs = getLocalDoctors();
  const docProfile = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower);
  const targetId = docProfile?.id || clean;
  const targetEmail = docProfile?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');

  const currentExpiry = docProfile?.licenseExpiresAt ? new Date(docProfile.licenseExpiresAt) : new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = addDays(baseDate, days).toISOString();

  const updates: Partial<DoctorProfile> = {
    status: 'active',
    licenseExpiresAt: newExpiry,
  };

  // 1. Mise à jour LocalStorage et Session
  let updatedDoc: DoctorProfile | null = null;
  const updatedList = localDocs.map(d => {
    if (d.id === targetId || (targetEmail && d.email.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      return up;
    }
    return d;
  });
  if (updatedDoc) {
    saveLocalDoctors(updatedList);
  }

  if (typeof window !== 'undefined') {
    try {
      const savedSession = localStorage.getItem('telemed_session_v2');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (
          parsed.profile?.id === targetId ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore (AWAIT TOTAL)
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'doctors', targetId), updates, { merge: true });
      if (targetEmail) {
        await setDoc(doc(db, 'doctors', targetEmail), updates, { merge: true });
        const q = query(collection(db, 'doctors'), where('email', '==', targetEmail));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(dSnap => setDoc(dSnap.ref, updates, { merge: true })));
      }
    } catch (e) {
      console.warn('Firebase renewDoctorLicense notice:', e);
    }
  }

  // 3. Mise à jour API Serverless Cloud (AWAIT TOTAL)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renew_doctor_license', payload: { doctorId: targetId, email: targetEmail, days } })
      });
    } catch (e) {}
  }

  return updatedDoc;
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
