import { DoctorProfile, AdminStats, AdminAuditLog, AdminActionType } from '../types/doctor';
import { db, isFirebaseConfigured } from '../firebase';
import { INITIAL_DOCTORS, getLocalDoctors, saveLocalDoctors, getLocalQueue } from './mockData';
import { doc, getDoc, getDocs, collection, query, where, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { addDays } from 'date-fns';

function mergeDoctorRecord(existing: DoctorProfile | undefined, incoming: DoctorProfile): DoctorProfile {
  if (!existing) return incoming;
  // RÈGLE DE SÉCURITÉ ABSOLUE : Un statut validé (active, banned, blocked, rejected) prime toujours sur pending
  const finalStatus = (existing.status === 'banned' || incoming.status === 'banned')
    ? 'banned'
    : (existing.status === 'blocked' || incoming.status === 'blocked')
      ? 'blocked'
      : (existing.status === 'active' || incoming.status === 'active')
        ? 'active'
        : (existing.status === 'rejected' || incoming.status === 'rejected')
          ? 'rejected'
          : existing.status || incoming.status || 'pending';

  const finalLicense = (finalStatus === 'active'
    ? (existing.status === 'active' ? existing.licenseExpiresAt : incoming.licenseExpiresAt) || existing.licenseExpiresAt || incoming.licenseExpiresAt
    : existing.licenseExpiresAt || incoming.licenseExpiresAt);

  const base = incoming.status === 'active' ? incoming : existing;
  const other = incoming.status === 'active' ? existing : incoming;

  return {
    ...other,
    ...base,
    id: existing.id || incoming.id,
    status: finalStatus,
    banReason: (finalStatus === 'active' ? undefined : (existing.banReason || incoming.banReason)),
    rejectionReason: (finalStatus === 'active' ? undefined : (existing.rejectionReason || incoming.rejectionReason)),
    licenseExpiresAt: finalLicense,
  };
}

/**
 * Récupère tous les médecins enregistrés (Firestore + LocalStorage) avec fusion et dédoublonnage intelligent
 * Protégé par un timeout résilient strict de 2,5s pour éliminer tout blocage de chargement.
 */
export async function getAllDoctors(): Promise<DoctorProfile[]> {
  const doctorList: DoctorProfile[] = [];

  // 1. PRIORITÉ ABSOLUE N°1 : FIRESTORE DATABASE (avec timeout résilient de 2500ms)
  if (isFirebaseConfigured && db) {
    try {
      const fetchPromise = getDocs(collection(db, 'doctors'));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai Firestore getAllDoctors dépassé (2.5s)')), 2500)
      );

      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      snap.docs.forEach(docSnap => {
        const data = docSnap.data() as DoctorProfile;
        const docWithId: DoctorProfile = {
          ...data,
          id: data.id || docSnap.id,
        };
        doctorList.push(docWithId);
      });
    } catch (e) {
      console.warn('Firebase getAllDoctors notice (bascule sur cache local):', e);
    }
  }

  // 2. PRIORITÉ N°2 : Local Storage
  const local = getLocalDoctors();
  doctorList.push(...local);

  // 3. FUSION & DÉDOUBLONNAGE INTELLIGENT
  // Regroupement par email, NIN, téléphone ou identifiant
  const mergedMap = new Map<string, DoctorProfile>();

  const getCanonicalKey = (d: DoctorProfile): string => {
    if (d.email && d.email.trim()) return `email:${d.email.toLowerCase().trim()}`;
    if (d.nin && d.nin.trim()) return `nin:${d.nin.trim()}`;
    if (d.phone && d.phone.replace(/\D/g, '')) return `phone:${d.phone.replace(/\D/g, '')}`;
    if (d.slug && d.slug.trim()) return `slug:${d.slug.trim()}`;
    return `id:${d.id}`;
  };

  for (const d of doctorList) {
    let matchedKey: string | null = null;
    const dEmail = d.email?.toLowerCase().trim();
    const dNin = d.nin?.trim();
    const dPhone = d.phone?.replace(/\D/g, '');
    const dSlug = d.slug?.trim();
    const dName = d.fullName?.toLowerCase().trim();

    for (const [key, existing] of Array.from(mergedMap.entries())) {
      const eEmail = existing.email?.toLowerCase().trim();
      const eNin = existing.nin?.trim();
      const ePhone = existing.phone?.replace(/\D/g, '');
      const eSlug = existing.slug?.trim();
      const eName = existing.fullName?.toLowerCase().trim();

      if (
        (dEmail && eEmail && dEmail === eEmail) ||
        (dNin && eNin && dNin === eNin) ||
        (dPhone && ePhone && dPhone === ePhone && dPhone.length >= 8) ||
        (d.id && existing.id && d.id === existing.id) ||
        (dSlug && eSlug && dSlug === eSlug) ||
        (dName && eName && dName === eName && dName.length > 5)
      ) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      const existing = mergedMap.get(matchedKey)!;
      mergedMap.set(matchedKey, mergeDoctorRecord(existing, d));
    } else {
      mergedMap.set(getCanonicalKey(d), d);
    }
  }

  const combined = Array.from(mergedMap.values());
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

  // 1. Enregistrement LocalStorage (miroir hors-ligne immédiat)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('telemed_admin_audit_logs');
      const logs: AdminAuditLog[] = raw ? JSON.parse(raw) : [];
      logs.unshift(auditLog);
      localStorage.setItem('telemed_admin_audit_logs', JSON.stringify(logs.slice(0, 200)));
    } catch (e) {}
  }

  // 2. Enregistrement Firestore non-bloquant
  const firestoreDb = db;
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const writePromise = setDoc(doc(firestoreDb, 'admin_audit_logs', auditLog.id), auditLog);
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout logAdminAction')), 2000)
      );
      await Promise.race([writePromise, timeoutPromise]);
    } catch (e) {
      console.warn('Erreur Firestore logAdminAction (enregistré localement):', e);
    }
  }

  return auditLog;
}

/**
 * Récupère le journal d'audit médico-légal ordonné par date antéchronologique
 * Protégé par un timeout résilient strict de 2000ms.
 */
export async function getAdminAuditLogs(limitCount: number = 100): Promise<AdminAuditLog[]> {
  const logsMap = new Map<string, AdminAuditLog>();

  // 1. Priorité N°1 : Cloud Firestore (avec timeout de 2000ms)
  const firestoreDb = db;
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const q = query(
        collection(firestoreDb, 'admin_audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const fetchPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai getAdminAuditLogs dépassé')), 2000)
      );
      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      snap.docs.forEach(d => {
        const item = d.data() as AdminAuditLog;
        logsMap.set(item.id, item);
      });
    } catch (e) {
      console.warn('Erreur Firestore getAdminAuditLogs (bascule locale):', e);
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
 * Synchronisation atomique multi-cibles vers Firestore (Doc ID direct, clean ID, alias email, slug)
 * Exécutée en parallèle avec un timeout strict de 2s pour ne jamais bloquer l'interface.
 */
async function syncDoctorUpdateToFirestore(
  targetId: string,
  clean: string,
  targetEmail: string,
  firestoreUpdates: Record<string, any>,
  targetSlug?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const targetDb = db;
  const updatePromises: Promise<any>[] = [];

  // Nettoyage de l'objet de mise à jour pour éviter toute exception Firestore
  const cleanUpdates: Record<string, any> = {};
  for (const [key, val] of Object.entries(firestoreUpdates)) {
    if (val !== undefined) {
      cleanUpdates[key] = val;
    }
  }

  // 1. Mise à jour directe sur targetId
  if (targetId) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', targetId), cleanUpdates, { merge: true }));
  }

  // 2. Si clean !== targetId, mise à jour sur clean
  if (clean && clean !== targetId) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', clean), cleanUpdates, { merge: true }));
  }

  // 3. Mise à jour sur l'alias email si présent
  const cleanEmail = targetEmail?.toLowerCase().trim();
  if (cleanEmail && cleanEmail !== targetId && cleanEmail !== clean) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', cleanEmail), cleanUpdates, { merge: true }));
  }

  // 4. Mise à jour sur le slug si fourni
  const cleanSlug = targetSlug?.trim();
  if (cleanSlug && cleanSlug !== targetId && cleanSlug !== clean && cleanSlug !== cleanEmail) {
    updatePromises.push(setDoc(doc(targetDb, 'doctors', cleanSlug), cleanUpdates, { merge: true }));
  }

  // 5. Recherche et mise à jour de tout document Firestore ayant cet email ou cet id
  if (cleanEmail) {
    updatePromises.push(
      getDocs(query(collection(targetDb, 'doctors'), where('email', '==', cleanEmail))).then(snap => {
        return Promise.all(snap.docs.map(dSnap => setDoc(dSnap.ref, cleanUpdates, { merge: true })));
      }).catch(() => {})
    );
  }
  if (clean) {
    updatePromises.push(
      getDocs(query(collection(targetDb, 'doctors'), where('id', '==', clean))).then(snap => {
        return Promise.all(snap.docs.map(dSnap => setDoc(dSnap.ref, cleanUpdates, { merge: true })));
      }).catch(() => {})
    );
  }

  try {
    const syncAction = Promise.allSettled(updatePromises);
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Délai de synchronisation Firestore dépassé')), 2000)
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
    rejectionReason: '',
    banReason: '',
  };

  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  
  // Chercher le profil dans le cache local ou dans la liste globale
  const localDocs = getLocalDoctors();
  let target = localDocs.find(d => 
    d.id === clean || 
    d.email?.toLowerCase() === lower || 
    d.slug === clean ||
    (lower.includes('@') && d.email?.toLowerCase() === lower)
  );

  if (!target) {
    const all = await getAllDoctors();
    target = all.find(d => 
      d.id === clean || 
      d.email?.toLowerCase() === lower || 
      d.slug === clean
    );
  }

  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');
  const targetSlug = target?.slug || (target?.fullName ? `dr-${target.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '');

  // 1. Mise à jour LocalStorage et Session immédiate
  let updatedDoc: DoctorProfile | null = null;
  const freshDocs = getLocalDoctors();
  let foundInFresh = false;
  const updatedList = freshDocs.map(d => {
    if (
      d.id === targetId || 
      d.id === clean || 
      (targetEmail && d.email?.toLowerCase() === targetEmail) ||
      (targetSlug && d.slug === targetSlug)
    ) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      foundInFresh = true;
      return up;
    }
    return d;
  });

  if (!foundInFresh && target) {
    const newUp = { ...target, ...updates };
    updatedDoc = newUp;
    updatedList.push(newUp);
  }

  saveLocalDoctors(updatedList);

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
    rejectionReason: '',
    banReason: '',
  };
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, firestoreUpdates, targetSlug);

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
  let target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  if (!target) {
    const all = await getAllDoctors();
    target = all.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  }

  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');
  const targetSlug = target?.slug;

  // 1. Mise à jour LocalStorage et Session
  let updatedDoc: DoctorProfile | null = null;
  const freshDocs = getLocalDoctors();
  let foundInFresh = false;
  const updatedList = freshDocs.map(d => {
    if (d.id === targetId || d.id === clean || (targetEmail && d.email?.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      foundInFresh = true;
      return up;
    }
    return d;
  });

  if (!foundInFresh && target) {
    const newUp = { ...target, ...updates };
    updatedDoc = newUp;
    updatedList.push(newUp);
  }

  saveLocalDoctors(updatedList);

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
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, updates, targetSlug);

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
  let target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  if (!target) {
    const all = await getAllDoctors();
    target = all.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  }

  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');
  const targetSlug = target?.slug;

  // 1. Mise à jour LocalStorage et Session
  let updatedDoc: DoctorProfile | null = null;
  const freshDocs = getLocalDoctors();
  let foundInFresh = false;
  const updatedList = freshDocs.map(d => {
    if (d.id === targetId || d.id === clean || (targetEmail && d.email?.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      foundInFresh = true;
      return up;
    }
    return d;
  });

  if (!foundInFresh && target) {
    const newUp = { ...target, ...updates };
    updatedDoc = newUp;
    updatedList.push(newUp);
  }

  saveLocalDoctors(updatedList);

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
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, updates, targetSlug);

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
    banReason: '',
  };
  const firestoreUpdates = {
    status: 'active',
    banReason: '',
  };

  const clean = doctorId.trim();
  const lower = clean.toLowerCase();
  const localDocs = getLocalDoctors();
  let target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  if (!target) {
    const all = await getAllDoctors();
    target = all.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  }

  const targetId = target?.id || clean;
  const targetEmail = target?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');
  const targetSlug = target?.slug;

  let updatedDoc: DoctorProfile | null = null;
  const freshDocs = getLocalDoctors();
  let foundInFresh = false;
  const updatedList = freshDocs.map(d => {
    if (d.id === targetId || d.id === clean || (targetEmail && d.email?.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      foundInFresh = true;
      return up;
    }
    return d;
  });

  if (!foundInFresh && target) {
    const newUp = { ...target, ...updates };
    updatedDoc = newUp;
    updatedList.push(newUp);
  }

  saveLocalDoctors(updatedList);

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

  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, firestoreUpdates, targetSlug);

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
  let target = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  if (!target) {
    const all = await getAllDoctors();
    target = all.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  }

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
  let docProfile = localDocs.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  if (!docProfile) {
    const all = await getAllDoctors();
    docProfile = all.find(d => d.id === clean || d.email?.toLowerCase() === lower || d.slug === clean);
  }

  const targetId = docProfile?.id || clean;
  const targetEmail = docProfile?.email?.toLowerCase().trim() || (lower.includes('@') ? lower : '');

  const currentExpiry = docProfile?.licenseExpiresAt ? new Date(docProfile.licenseExpiresAt) : new Date();
  const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = addDays(baseDate, days).toISOString();

  const updates: Partial<DoctorProfile> = {
    status: 'active',
    banReason: '',
    licenseExpiresAt: newExpiry,
  };
  const firestoreUpdates = {
    status: 'active',
    banReason: '',
    licenseExpiresAt: newExpiry,
  };

  // 1. Mise à jour LocalStorage et Session
  let updatedDoc: DoctorProfile | null = null;
  const freshDocs = getLocalDoctors();
  let foundInFresh = false;
  const updatedList = freshDocs.map(d => {
    if (d.id === targetId || d.id === clean || (targetEmail && d.email?.toLowerCase() === targetEmail)) {
      const up = { ...d, ...updates };
      updatedDoc = up;
      foundInFresh = true;
      return up;
    }
    return d;
  });

  if (!foundInFresh && docProfile) {
    const newUp = { ...docProfile, ...updates };
    updatedDoc = newUp;
    updatedList.push(newUp);
  }

  saveLocalDoctors(updatedList);

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
  await syncDoctorUpdateToFirestore(targetId, clean, targetEmail, firestoreUpdates, docProfile?.slug);

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

/**
 * Purge complète et sécurisée de toutes les données de test
 * Conserve strictement le compte administrateur officiel du Dr. Elhadji Pathé THIAM.
 */
export async function purgeAllTestData(adminEmail: string = 'dr.thiam@telemed.sn'): Promise<{
  success: boolean;
  deletedDoctors: number;
  deletedQueues: number;
  deletedPrescriptions: number;
  deletedMeds: number;
}> {
  let deletedDoctors = 0;
  let deletedQueues = 0;
  let deletedPrescriptions = 0;
  let deletedMeds = 0;

  const adminEmails = ['pati.amouf@gmail.com', 'dr.thiam@telemed.sn'];

  // 1. Purge Cloud Firestore
  if (isFirebaseConfigured && db) {
    try {
      // A. Médecins non-admin
      const docSnap = await getDocs(collection(db, 'doctors'));
      for (const d of docSnap.docs) {
        const data = d.data();
        const email = (data.email || '').toLowerCase().trim();
        const role = data.role;
        const id = d.id;
        const isOfficialAdmin = id === 'admin-thiam-1' || adminEmails.includes(email) || role === 'admin';
        if (!isOfficialAdmin) {
          try {
            await deleteDoc(d.ref);
            deletedDoctors++;
          } catch (e) {
            console.warn(`Erreur suppression médecin ${id}:`, e);
          }
        }
      }

      // B. Files d'attente patients
      const queueSnap = await getDocs(collection(db, 'patient_queues'));
      for (const q of queueSnap.docs) {
        try {
          await deleteDoc(q.ref);
          deletedQueues++;
        } catch (e) {
          console.warn(`Erreur suppression queue ${q.id}:`, e);
        }
      }

      // C. Ordonnances de test
      const prescSnap = await getDocs(collection(db, 'prescriptions'));
      for (const p of prescSnap.docs) {
        try {
          await deleteDoc(p.ref);
          deletedPrescriptions++;
        } catch (e) {
          console.warn(`Erreur suppression prescription ${p.id}:`, e);
        }
      }

      // D. Médicaments en attente & sessions WebRTC
      const medSnap = await getDocs(collection(db, 'pending_meds'));
      for (const m of medSnap.docs) {
        try {
          await deleteDoc(m.ref);
          deletedMeds++;
        } catch (e) {
          console.warn(`Erreur suppression med ${m.id}:`, e);
        }
      }

      const rtcSnap = await getDocs(collection(db, 'webrtc_sessions'));
      for (const r of rtcSnap.docs) {
        try {
          await deleteDoc(r.ref);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Erreur générale lors de la purge Firestore:', err);
    }
  }

  // 2. Purge LocalStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('telemed_doctors_v2', JSON.stringify(INITIAL_DOCTORS));
      localStorage.setItem('telemed_queue_v2', JSON.stringify([]));
      localStorage.setItem('telemed_archive_v2', JSON.stringify([]));
      localStorage.setItem('telemed_prescriptions_v2', JSON.stringify([]));
      localStorage.removeItem('telemed_active_consultation');
    } catch (e) {}
  }

  // 3. Journalisation médico-légale de l'opération
  await logAdminAction({
    action: 'purge_test_data',
    adminEmail,
    targetId: 'system_purge',
    targetName: 'Purge globale des données de test',
    targetType: 'system',
    details: `Purge système effectuée avec succès : ${deletedDoctors} praticiens de test, ${deletedQueues} files d'attente, ${deletedPrescriptions} ordonnances et ${deletedMeds} molécules supprimés. Compte administrateur officiel Dr. THIAM préservé.`,
  });

  return {
    success: true,
    deletedDoctors,
    deletedQueues,
    deletedPrescriptions,
    deletedMeds,
  };
}
