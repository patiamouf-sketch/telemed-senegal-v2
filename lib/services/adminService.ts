import { DoctorProfile, AdminStats, AdminAuditLog, AdminActionType } from '../types/doctor';
import { db, isFirebaseConfigured } from '../firebase';
import { getLocalDoctors, saveLocalDoctors, getLocalQueue } from './mockData';
import { doc, getDoc, getDocs, collection, query, where, setDoc, deleteDoc, deleteField, orderBy, limit } from 'firebase/firestore';
import { addDays } from 'date-fns';

function mergeDoctorRecord(existing: DoctorProfile | undefined, incoming: DoctorProfile): DoctorProfile {
  if (!existing) return incoming;
  // RÈGLE DE SÉCURITÉ ABSOLUE : Un statut validé (active, banned, blocked, rejected) prime
  const finalStatus = (existing.status === 'banned' || incoming.status === 'banned')
    ? 'banned'
    : (existing.status === 'blocked' || incoming.status === 'blocked')
      ? 'blocked'
      : (existing.status === 'active' || incoming.status === 'active')
        ? 'active'
        : (existing.status === 'rejected' || incoming.status === 'rejected')
          ? 'rejected'
          : existing.status || incoming.status || 'pending';

  const finalLicense = (existing.status === 'active' ? existing.licenseExpiresAt : incoming.licenseExpiresAt) ||
    existing.licenseExpiresAt || incoming.licenseExpiresAt;

  return {
    ...incoming,
    ...existing,
    id: existing.id || incoming.id,
    status: finalStatus,
    banReason: existing.banReason || incoming.banReason,
    rejectionReason: existing.rejectionReason || incoming.rejectionReason,
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
        const docWithId: DoctorProfile = {
          ...data,
          id: data.id || docSnap.id,
        };
        const key = docWithId.email ? docWithId.email.toLowerCase().trim() : docWithId.id;
        if (key) {
          emailMap.set(key, mergeDoctorRecord(emailMap.get(key), docWithId));
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
      const existing = emailMap.get(key);
      if (!existing) {
        emailMap.set(key, d);
      } else {
        emailMap.set(key, mergeDoctorRecord(existing, d));
      }
    }
  });

  const combined = Array.from(emailMap.values());
  saveLocalDoctors(combined);
  return combined;
}

export async function getPendingDoctors(): Promise<DoctorProfile[]> {
  const doctors = await getAllDoctors();
  return doctors.filter(d => d.status === 'pending');
}

/**
 * Enregistre une action d'administration dans le journal d'audit légal (Firestore + LocalStorage)
 */
export async function logAdminAction(
  data: Omit<AdminAuditLog, 'id' | 'timestamp'>
): Promise<AdminAuditLog> {
  const auditLog: AdminAuditLog = {
    ...data,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // 1. Enregistrement LocalStorage (miroir hors-ligne)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('telemed_admin_audit_logs');
      const logs: AdminAuditLog[] = raw ? JSON.parse(raw) : [];
      logs.unshift(auditLog);
      localStorage.setItem('telemed_admin_audit_logs', JSON.stringify(logs.slice(0, 200)));
    } catch (e) {}
  }

  // 2. Enregistrement Firestore
  const firestoreDb = db;
  if (isFirebaseConfigured && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'admin_audit_logs', auditLog.id), auditLog);
    } catch (e) {
      console.warn('Erreur Firestore logAdminAction:', e);
    }
  }

  return auditLog;
}

/**
 * Récupère le journal d'audit médico-légal ordonné par date antéchronologique
 */
export async function getAdminAuditLogs(limitCount: number = 100): Promise<AdminAuditLog[]> {
  const logsMap = new Map<string, AdminAuditLog>();

  // 1. Priorité N°1 : Cloud Firestore
  const firestoreDb = db;
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const q = query(
        collection(firestoreDb, 'admin_audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const item = d.data() as AdminAuditLog;
        logsMap.set(item.id, item);
      });
    } catch (e) {
      console.warn('Erreur Firestore getAdminAuditLogs:', e);
    }
  }

  // 2. Priorité N°2 : Cache Local
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('telemed_admin_audit_logs');
      if (raw) {
        const localLogs: AdminAuditLog[] = JSON.parse(raw);
        localLogs.forEach(l => {
          if (!logsMap.has(l.id)) {
            logsMap.set(l.id, l);
          }
        });
      }
    } catch (e) {}
  }

  return Array.from(logsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Synchronisation atomique multi-cibles vers Firestore (Doc ID direct, clean ID, alias email)
 * Exécutée en parallèle avec un timeout strict de 3s pour ne jamais bloquer l'interface.
 */
async function syncDoctorUpdateToFirestore(
  targetId: string,
  clean: string,
  targetEmail: string,
  firestoreUpdates: Record<string, any>
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const targetDb = db;
  const updatePromises: Promise<any>[] = [];

  // 1. Mise à jour directe et immédiate sur targetId
  if (targetId) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', targetId), firestoreUpdates, { merge: true }));
  }

  // 2. Si clean !== targetId, mise à jour sur clean
  if (clean && clean !== targetId) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', clean), firestoreUpdates, { merge: true }));
  }

  // 3. Mise à jour sur l'alias email si présent
  const cleanEmail = targetEmail?.toLowerCase().trim();
  if (cleanEmail && cleanEmail !== targetId && cleanEmail !== clean) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', cleanEmail), firestoreUpdates, { merge: true }));
  }

  try {
    const syncAction = Promise.all(updatePromises);
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Délai de synchronisation Firestore dépassé')), 3000)
    );
    await Promise.race([syncAction, timeout]);
  } catch (e) {
    console.warn('syncDoctorUpdateToFirestore notice (fallback local appliqué):', e);
  }
}

export async function approveDoctor(
  doctorId: string,
  adminEmail: string = 'dr.thiam@telemed.sn'
): Promise<DoctorProfile | null> {
  const licenseExpiresAt = addDays(new Date(), 30).toISOString();
  const updates: Partial<DoctorProfile> = {
    status: 'active',
    licenseExpiresAt,
    rejectionReason: undefined,
    banReason: undefined,
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
    if (d.id === targetId || d.id === clean || (targetEmail && d.email.toLowerCase() === targetEmail)) {
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
          parsed.profile?.id === clean ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          parsed.user?.uid === clean ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore Multi-Cibles Directe
  const firestoreUpdates = {
    status: 'active',
    licenseExpiresAt,
    rejectionReason: deleteField(),
    banReason: deleteField(),
  };
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, firestoreUpdates);

  // 3. Traçabilité Médico-Légale (Journal d'audit)
  await logAdminAction({
    action: 'approve_doctor',
    adminEmail,
    targetId,
    targetName: target?.fullName || targetEmail || doctorId,
    targetType: 'doctor',
    details: 'Homologation ordinale ONMS validée par la direction médicale. Licence d’exercice de 30 jours activée.',
  });

  return updatedDoc || (target ? { ...target, ...updates } : null);
}

export async function rejectDoctor(
  doctorId: string,
  reason: string = 'Dossier incomplet ou non vérifié par l’ONMS',
  adminEmail: string = 'dr.thiam@telemed.sn'
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
    if (d.id === targetId || d.id === clean || (targetEmail && d.email.toLowerCase() === targetEmail)) {
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
          parsed.profile?.id === clean ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          parsed.user?.uid === clean ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore Multi-Cibles
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, updates);

  // 3. Traçabilité Médico-Légale (Journal d'audit)
  await logAdminAction({
    action: 'reject_doctor',
    adminEmail,
    targetId,
    targetName: target?.fullName || targetEmail || doctorId,
    targetType: 'doctor',
    reason,
    details: `Dossier de candidature rejeté par la direction médicale. Motif : ${reason}`,
  });

  return updatedDoc || (target ? { ...target, ...updates } : null);
}

export async function banDoctor(
  doctorId: string,
  reason: string = 'Non-respect des règles déontologiques ou dossier non conforme',
  adminEmail: string = 'dr.thiam@telemed.sn'
): Promise<DoctorProfile | null> {
  const updates: Partial<DoctorProfile> = {
    status: 'banned',
    banReason: reason,
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
    if (d.id === targetId || d.id === clean || (targetEmail && d.email.toLowerCase() === targetEmail)) {
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
          parsed.profile?.id === clean ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          parsed.user?.uid === clean ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore Multi-Cibles
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, updates);

  // 3. Traçabilité Médico-Légale (Journal d'audit)
  await logAdminAction({
    action: 'ban_doctor',
    adminEmail,
    targetId,
    targetName: target?.fullName || targetEmail || doctorId,
    targetType: 'doctor',
    reason,
    details: `Suspension déontologique de la licence d'exercice. Motif : ${reason}`,
  });

  return updatedDoc || (target ? { ...target, ...updates } : null);
}

export async function unbanDoctor(
  doctorId: string,
  adminEmail: string = 'dr.thiam@telemed.sn'
): Promise<DoctorProfile | null> {
  const updates: Partial<DoctorProfile> = {
    status: 'active',
    banReason: undefined,
  };
  const firestoreUpdates = {
    status: 'active',
    banReason: deleteField(),
  };

  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  const localDocs = getLocalDoctors();
  const target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower);
  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');

  let updatedDoc: DoctorProfile | null = null;
  const updatedList = localDocs.map(d => {
    if (d.id === targetId || d.id === clean || (targetEmail && d.email.toLowerCase() === targetEmail)) {
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
          parsed.profile?.id === clean ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          parsed.user?.uid === clean ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, firestoreUpdates);

  // 3. Traçabilité Médico-Légale (Journal d'audit)
  await logAdminAction({
    action: 'unban_doctor',
    adminEmail,
    targetId,
    targetName: target?.fullName || targetEmail || doctorId,
    targetType: 'doctor',
    details: 'Levée de la suspension ordinale et réactivation complète de la licence d’exercice.',
  });

  return updatedDoc || (target ? { ...target, ...updates } : null);
}

export async function deleteDoctorPermanently(
  doctorId: string,
  adminEmail: string = 'dr.thiam@telemed.sn'
): Promise<boolean> {
  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  const localDocs = getLocalDoctors();
  const target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower);
  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');

  // 1. Suppression LocalStorage
  const filtered = localDocs.filter(d => d.id !== targetId && d.id !== clean && (!targetEmail || d.email?.toLowerCase() !== targetEmail));
  saveLocalDoctors(filtered);

  // 2. Suppression Firestore Multi-Cibles
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'doctors', targetId));
      if (clean && clean !== targetId) {
        await deleteDoc(doc(db, 'doctors', clean));
      }
      if (targetEmail) {
        const q = query(collection(db, 'doctors'), where('email', '==', targetEmail));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(dSnap => deleteDoc(dSnap.ref)));
      }
      const qId = query(collection(db, 'doctors'), where('id', '==', targetId));
      const idSnap = await getDocs(qId);
      await Promise.all(idSnap.docs.map(dSnap => deleteDoc(dSnap.ref)));
    } catch (e) {
      console.warn('Firebase deleteDoctor notice:', e);
    }
  }

  // 3. Traçabilité Médico-Légale (Journal d'audit)
  await logAdminAction({
    action: 'delete_doctor',
    adminEmail,
    targetId,
    targetName: target?.fullName || targetEmail || doctorId,
    targetType: 'doctor',
    details: 'Suppression définitive et irréversible du compte praticien de la base nationale.',
  });

  return true;
}

export async function renewDoctorLicense(
  doctorId: string,
  days: number = 30,
  adminEmail: string = 'dr.thiam@telemed.sn'
): Promise<DoctorProfile | null> {
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
    banReason: undefined,
    licenseExpiresAt: newExpiry,
  };
  const firestoreUpdates = {
    status: 'active',
    banReason: deleteField(),
    licenseExpiresAt: newExpiry,
  };

  // 1. Mise à jour LocalStorage et Session
  let updatedDoc: DoctorProfile | null = null;
  const updatedList = localDocs.map(d => {
    if (d.id === targetId || d.id === clean || (targetEmail && d.email.toLowerCase() === targetEmail)) {
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
          parsed.profile?.id === clean ||
          (targetEmail && parsed.profile?.email?.toLowerCase() === targetEmail) ||
          parsed.user?.uid === targetId ||
          parsed.user?.uid === clean ||
          (targetEmail && parsed.user?.email?.toLowerCase() === targetEmail)
        ) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  // 2. Mise à jour Firestore Multi-Cibles
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, firestoreUpdates);

  // 3. Traçabilité Médico-Légale (Journal d'audit)
  await logAdminAction({
    action: 'renew_license',
    adminEmail,
    targetId,
    targetName: docProfile?.fullName || targetEmail || doctorId,
    targetType: 'doctor',
    details: `Renouvellement de la licence d'exercice (+${days} jours). Nouvelle date d'expiration : ${new Date(newExpiry).toLocaleDateString('fr-FR')}.`,
  });

  return updatedDoc || (docProfile ? { ...docProfile, ...updates } : null);
}

export async function getAdminStats(preloadedDoctors?: DoctorProfile[]): Promise<AdminStats> {
  const doctors = preloadedDoctors || await getAllDoctors();
  const queue = getLocalQueue();

  return {
    totalDoctors: doctors.length,
    pendingCount: doctors.filter(d => d.status === 'pending').length,
    activeCount: doctors.filter(d => d.status === 'active').length,
    rejectedCount: doctors.filter(d => d.status === 'rejected').length,
    activePatientsToday: queue.length,
  };
}
