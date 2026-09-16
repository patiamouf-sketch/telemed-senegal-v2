import { DoctorProfile, DoctorStatus, PatientQueueItem, ChatMessage } from '../types/doctor';
import { OfficialPrescription, PendingMedication } from '../types/prescription';
import { sanitizeText } from '../utils/sanitizer';
import { db, isFirebaseConfigured } from '../firebase';
import { addDays } from 'date-fns';
import {
  getLocalDoctors,
  saveLocalDoctors,
  getLocalQueue,
  saveLocalQueue,
  getLocalArchive,
  saveLocalArchive,
  getLocalPrescriptions,
  saveLocalPrescriptions,
} from './mockData';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  arrayUnion,
  orderBy
} from 'firebase/firestore';

/**
 * Nettoie récursivement un objet de toute valeur undefined avant envoi à Cloud Firestore
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        result[key] = cleanFirestoreData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Création ou mise à jour d'un profil médecin (Actif immédiatement avec 90 jours d'accès gratuit)
 */
export async function createDoctorProfile(
  profileData: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'> & { status?: DoctorStatus },
  userId?: string
): Promise<DoctorProfile> {
  const id = userId || `doc-${Date.now()}`;
  const licenseExpiresAt = profileData.licenseExpiresAt || '';
  const newDoctor: DoctorProfile = {
    ...profileData,
    id,
    status: profileData.status || 'pending', // Nouveau médecin en attente d'homologation
    licenseExpiresAt,
    createdAt: new Date().toISOString(),
    consultationFee: profileData.consultationFee || profileData.visioConsultationFee || profileData.avisMedicalFee || 5000,
    avisMedicalFee: profileData.avisMedicalFee || profileData.consultationFee || 5000,
    visioConsultationFee: profileData.visioConsultationFee || profileData.consultationFee || 5000,
    waveNumber: profileData.waveNumber || profileData.phone,
    omNumber: profileData.omNumber || profileData.phone,
    availableForTeleconsult: true,
  };

  // 1. Enregistrement Firestore Multi-Clés (ID, Email, Slug)
  if (isFirebaseConfigured && db) {
    const firestoreDb = db;
    const cleanData = cleanFirestoreData(newDoctor);
    const writePromises: Promise<any>[] = [
      setDoc(doc(firestoreDb, 'doctors', id), cleanData, { merge: true }),
    ];

    const cleanEmail = newDoctor.email?.toLowerCase().trim();
    if (cleanEmail && cleanEmail !== id) {
      writePromises.push(setDoc(doc(firestoreDb, 'doctors', cleanEmail), cleanData, { merge: true }));
    }

    if (newDoctor.slug && newDoctor.slug !== id && newDoctor.slug !== cleanEmail) {
      writePromises.push(setDoc(doc(firestoreDb, 'doctors', newDoctor.slug), cleanData, { merge: true }));
    }

    try {
      await Promise.allSettled(writePromises);
    } catch (e) {
      console.warn('Firebase save failed, falling back to local storage:', e);
    }
  }

  // 2. Enregistrement LocalStorage
  const doctors = getLocalDoctors();
  const existingIdx = doctors.findIndex(d => d.id === id || d.email.toLowerCase() === newDoctor.email.toLowerCase());
  if (existingIdx >= 0) {
    doctors[existingIdx] = newDoctor;
  } else {
    doctors.unshift(newDoctor);
  }
  saveLocalDoctors(doctors);

  return newDoctor;
}

function syncDoctorToLocal(docData: DoctorProfile) {
  try {
    const local = getLocalDoctors();
    const idx = local.findIndex(l => l.id === docData.id || l.email.toLowerCase() === docData.email.toLowerCase());
    const finalStatus = docData.status || 'pending';
    const finalLicense = docData.licenseExpiresAt || '';

    const normalizedDoc: DoctorProfile = {
      ...docData,
      status: finalStatus,
      licenseExpiresAt: finalLicense,
    };

    if (idx >= 0) {
      local[idx] = {
        ...local[idx],
        ...normalizedDoc,
      };
    } else {
      local.unshift(normalizedDoc);
    }
    saveLocalDoctors(local);

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('telemed_session_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.profile?.id === docData.id ||
          parsed.profile?.email?.toLowerCase() === docData.email.toLowerCase() ||
          parsed.user?.uid === docData.id ||
          parsed.user?.email?.toLowerCase() === docData.email.toLowerCase()
        ) {
          parsed.profile = {
            ...parsed.profile,
            ...normalizedDoc,
          };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    }
  } catch (e) {}
}

export async function getDoctorById(id: string): Promise<DoctorProfile | null> {
  if (!id) return null;
  const cleanId = id.trim();
  const lowerId = cleanId.toLowerCase();

  let candidate: DoctorProfile | null = null;

  // 1. FIRESTORE DATABASE DIRECT (avec timeout résilient de 2000ms)
  if (isFirebaseConfigured && db) {
    const firestoreDb = db;
    try {
      const fetchDirect = async (): Promise<DoctorProfile | null> => {
        // Essai A : Recherche directe par Document ID
        const docRef = doc(firestoreDb, 'doctors', cleanId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as DoctorProfile;
          return { ...data, id: data.id || snap.id };
        }

        // Essai B : Si cleanId ressemble à un email
        const isEmail = lowerId.includes('@');
        const targetEmail = isEmail ? lowerId : '';
        if (targetEmail) {
          const qEmail = query(collection(firestoreDb, 'doctors'), where('email', '==', targetEmail));
          const emailSnap = await getDocs(qEmail);
          if (!emailSnap.empty) {
            const activeDoc = emailSnap.docs.find(d => (d.data() as DoctorProfile).status === 'active') || emailSnap.docs[0];
            const docData = activeDoc.data() as DoctorProfile;
            return { ...docData, id: docData.id || activeDoc.id };
          }
        }

        // Essai C : Recherche par champ 'id'
        const qId = query(collection(firestoreDb, 'doctors'), where('id', '==', cleanId));
        const idSnap = await getDocs(qId);
        if (!idSnap.empty) {
          const activeDoc = idSnap.docs.find(d => (d.data() as DoctorProfile).status === 'active') || idSnap.docs[0];
          const docData = activeDoc.data() as DoctorProfile;
          return { ...docData, id: docData.id || activeDoc.id };
        }

        return null;
      };

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout Firestore getDoctorById (2s)')), 2000)
      );

      candidate = await Promise.race([fetchDirect(), timeoutPromise]);
    } catch (e) {
      console.warn('Firebase getDoctorById notice (repli local):', e);
    }
  }

  // 2. CACHE LOCAL DE REPLI INSTANTANÉ
  const doctors = getLocalDoctors();
  const matchedLocal = doctors.find(d => d.id === cleanId || d.email.toLowerCase() === lowerId);
  if (matchedLocal && (!candidate || (matchedLocal.status === 'active' && candidate.status !== 'active'))) {
    candidate = matchedLocal;
  }

  if (candidate) {
    syncDoctorToLocal(candidate);
  }

  return candidate;
}

export function listenToDoctorProfile(
  idOrEmail: string,
  callback: (profile: DoctorProfile | null) => void
): () => void {
  if (!idOrEmail) return () => {};
  const clean = idOrEmail.trim();
  const lower = clean.toLowerCase();
  const firestoreDb = db;
  const isEmail = lower.includes('@');
  let isCleanedUp = false;

  const unsubs: (() => void)[] = [];

  // Écouteur en direct Firestore si configuré
  if (isFirebaseConfigured && firestoreDb) {
    try {
      // 1. Écouteur sur le document direct
      if (clean && !clean.includes('/')) {
        const docRef = doc(firestoreDb, 'doctors', clean);
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (isCleanedUp) return;
          if (docSnap.exists()) {
            const data = docSnap.data() as DoctorProfile;
            const profile = { ...data, id: data.id || docSnap.id };
            syncDoctorToLocal(profile);
            callback(profile);
          }
        }, (err) => {
          console.warn('listenToDoctorProfile doc error:', err);
        });
        unsubs.push(unsubDoc);
      }

      // 2. Écouteur temps réel sur la requête par email
      if (isEmail) {
        const qEmail = query(collection(firestoreDb, 'doctors'), where('email', '==', lower));
        const unsubEmail = onSnapshot(qEmail, (snap) => {
          if (isCleanedUp) return;
          if (!snap.empty) {
            const activeDoc = snap.docs.find(d => (d.data() as DoctorProfile).status === 'active') || snap.docs[0];
            const data = activeDoc.data() as DoctorProfile;
            const profile = { ...data, id: data.id || activeDoc.id };
            syncDoctorToLocal(profile);
            callback(profile);
          }
        }, (err) => {
          console.warn('listenToDoctorProfile email query error:', err);
        });
        unsubs.push(unsubEmail);
      } else {
        // Si clean est un UID / ID, écouter aussi la requête where('id', '==', clean)
        const qId = query(collection(firestoreDb, 'doctors'), where('id', '==', clean));
        const unsubId = onSnapshot(qId, (snap) => {
          if (isCleanedUp) return;
          if (!snap.empty) {
            const activeDoc = snap.docs.find(d => (d.data() as DoctorProfile).status === 'active') || snap.docs[0];
            const data = activeDoc.data() as DoctorProfile;
            const profile = { ...data, id: data.id || activeDoc.id };
            syncDoctorToLocal(profile);
            callback(profile);
          }
        }, (err) => {
          console.warn('listenToDoctorProfile id query error:', err);
        });
        unsubs.push(unsubId);
      }
    } catch (e) {
      console.warn('listenToDoctorProfile exception:', e);
    }
  }

  // Émission initiale asynchrone différée (non-bloquante pour React)
  setTimeout(() => {
    if (isCleanedUp) return;
    const local = getLocalDoctors();
    const matched = local.find(d => d.id === clean || d.email.toLowerCase() === lower);
    if (matched) {
      callback(matched);
    }
  }, 0);

  // Polling de repli léger (toutes les 6s)
  const interval = setInterval(() => {
    if (isCleanedUp) return;
    const freshLocal = getLocalDoctors();
    const freshMatched = freshLocal.find(d => d.id === clean || d.email.toLowerCase() === lower);
    if (freshMatched) {
      callback(freshMatched);
    }
  }, 6000);

  return () => {
    isCleanedUp = true;
    unsubs.forEach(u => {
      try { u(); } catch (e) {}
    });
    clearInterval(interval);
  };
}

export async function getDoctorBySlug(slug: string): Promise<DoctorProfile | null> {
  if (!slug) return null;
  const clean = slug.toLowerCase().trim();
  const normalizedSlug = clean
    .replace(/^dr[\s.-]*/i, 'dr-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  let candidate: DoctorProfile | null = null;

  // 1. FIRESTORE DATABASE DIRECT (avec timeout résilient de 2000ms)
  if (isFirebaseConfigured && db) {
    const firestoreDb = db;
    try {
      const fetchSlug = async (): Promise<DoctorProfile | null> => {
        // A. Recherche par champ 'slug'
        const q = query(collection(firestoreDb, 'doctors'), where('slug', '==', normalizedSlug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const activeDoc = snap.docs.find(d => (d.data() as DoctorProfile).status === 'active') || snap.docs[0];
          const data = activeDoc.data() as DoctorProfile;
          return { ...data, id: data.id || activeDoc.id };
        }

        // B. Recherche par ID direct de document (ex: doc 'dr-elhadji-pathe-thiam' ou 'admin-thiam-1')
        const directDocRef = doc(firestoreDb, 'doctors', normalizedSlug);
        const directSnap = await getDoc(directDocRef);
        if (directSnap.exists()) {
          const data = directSnap.data() as DoctorProfile;
          return { ...data, id: data.id || directSnap.id };
        }

        // C. Recherche par champ 'id'
        const qId = query(collection(firestoreDb, 'doctors'), where('id', '==', normalizedSlug));
        const idSnap = await getDocs(qId);
        if (!idSnap.empty) {
          const activeDoc = idSnap.docs.find(d => (d.data() as DoctorProfile).status === 'active') || idSnap.docs[0];
          const data = activeDoc.data() as DoctorProfile;
          return { ...data, id: data.id || activeDoc.id };
        }

        // D. Résilience spécifique pour Dr. Pathé THIAM (alias fréquents)
        if (normalizedSlug.includes('thiam') || normalizedSlug.includes('pathe')) {
          const adminDocRef = doc(firestoreDb, 'doctors', 'admin-thiam-1');
          const adminSnap = await getDoc(adminDocRef);
          if (adminSnap.exists()) {
            const data = adminSnap.data() as DoctorProfile;
            return { ...data, id: data.id || adminSnap.id };
          }
        }

        return null;
      };

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout Firestore getDoctorBySlug (2s)')), 2000)
      );

      candidate = await Promise.race([fetchSlug(), timeoutPromise]);
    } catch (e) {
      console.warn('Firebase getDoctorBySlug notice (repli local):', e);
    }
  }

  // 2. CACHE LOCAL DE REPLI INSTANTANÉ
  const doctors = getLocalDoctors();
  const matchedLocal = doctors.find(d => {
    const dSlugNorm = d.slug?.toLowerCase().trim().replace(/^dr[\s.-]*/i, 'dr-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    return (
      dSlugNorm === normalizedSlug ||
      d.slug?.toLowerCase().trim() === normalizedSlug ||
      d.id?.toLowerCase() === normalizedSlug ||
      (normalizedSlug.includes('thiam') && (d.id === 'admin-thiam-1' || d.email?.toLowerCase().includes('pati.amouf')))
    );
  });

  if (matchedLocal && (!candidate || (matchedLocal.status === 'active' && candidate.status !== 'active'))) {
    candidate = matchedLocal;
  }

  if (candidate) {
    syncDoctorToLocal(candidate);
  }

  return candidate;
}

export async function updateDoctorProfile(id: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile | null> {
  const cleanId = (id || '').trim();
  const cleanData = cleanFirestoreData(updates);

  // 1. Mise à jour Firestore (Synchronisation multi-clés id et email pour cohérence totale)
  if (isFirebaseConfigured && db && cleanId) {
    try {
      await setDoc(doc(db, 'doctors', cleanId), cleanData, { merge: true });

      // Si l'email est disponible dans updates ou passé comme clé
      const targetEmail = (updates.email || (cleanId.includes('@') ? cleanId : '')).trim().toLowerCase();
      if (targetEmail && targetEmail !== cleanId) {
        await setDoc(doc(db, 'doctors', targetEmail), cleanData, { merge: true });
      }
    } catch (e) {
      console.warn('Firebase setDoc notice:', e);
    }
  }

  // 2. Mise à jour LocalStorage (telemed_doctors_v2)
  const doctors = getLocalDoctors();
  const lowerId = cleanId.toLowerCase();
  const idx = doctors.findIndex(d => 
    d.id?.toLowerCase() === lowerId || 
    d.email?.toLowerCase() === lowerId ||
    (updates.email && d.email?.toLowerCase() === updates.email.toLowerCase())
  );

  let updated: DoctorProfile | null = null;
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    updated = doctors[idx];
  } else {
    const newDoc = { id: cleanId, ...updates } as DoctorProfile;
    doctors.unshift(newDoc);
    saveLocalDoctors(doctors);
    updated = newDoc;
  }

  // 3. Mise à jour immédiate de la session active
  if (typeof window !== 'undefined') {
    try {
      const savedSession = localStorage.getItem('telemed_session_v2');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        parsed.profile = { ...(parsed.profile || {}), ...updates };
        if (parsed.user && updates.fullName) {
          parsed.user.displayName = updates.fullName;
        }
        localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
      }
    } catch (e) {}
  }

  return updated;
}

/**
 * Récupère l'ensemble des ordonnances directes émises par un médecin
 */
export async function getDoctorDirectPrescriptions(doctorIdOrSlug: string): Promise<OfficialPrescription[]> {
  const cleanKey = (doctorIdOrSlug || '').trim().toLowerCase();
  const results: OfficialPrescription[] = [];
  const seenHashes = new Set<string>();

  // 1. Essai Firestore
  if (isFirebaseConfigured && db && cleanKey) {
    try {
      const q = query(collection(db, 'prescriptions'), where('doctorId', '==', cleanKey));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data() as OfficialPrescription;
        if (data && data.hash && !seenHashes.has(data.hash)) {
          seenHashes.add(data.hash);
          results.push(data);
        }
      });
    } catch (e) {
      console.warn('Firebase getDoctorDirectPrescriptions notice:', e);
    }
  }

  // 2. Cache LocalStorage
  const localList = getLocalPrescriptions();
  localList.forEach(p => {
    if (
      p.hash &&
      !seenHashes.has(p.hash) &&
      (
        p.doctorId?.toLowerCase() === cleanKey ||
        p.doctorName?.toLowerCase().includes(cleanKey) ||
        cleanKey.includes('admin') ||
        cleanKey === 'dr-elhadji-pathe-thiam'
      )
    ) {
      seenHashes.add(p.hash);
      results.push(p);
    }
  });

  // Tri par date décroissante
  return results.sort((a, b) => new Date(b.sealedAt).getTime() - new Date(a.sealedAt).getTime());
}

/**
 * Ajout d'un patient à la file d'attente
 */
export async function addPatientToQueue(
  patientData: Omit<PatientQueueItem, 'id' | 'status' | 'joinedAt'>
): Promise<PatientQueueItem> {
  const id = `pat-${Date.now()}`;
  const newQueueItem: PatientQueueItem = {
    ...patientData,
    id,
    status: 'waiting',
    isReadOnly: false,
    joinedAt: new Date().toISOString(),
    roomId: `room-${patientData.doctorSlug}-${Math.random().toString(36).substring(2, 7)}`,
    messages: [
      {
        id: `msg-init-${Date.now()}`,
        sender: 'system',
        type: 'text',
        text: `Dossier patient ouvert pour ${patientData.serviceType === 'avis_medical' ? 'Avis Médical' : 'Visio Consultation'}.`,
        timestamp: new Date().toISOString(),
      }
    ]
  };

  // 1. Synchronisation Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'patient_queues', id), cleanFirestoreData(newQueueItem));
    } catch (e) {
      console.warn('Firebase addPatientToQueue failed:', e);
    }
  }

  // 2. Cache local
  const queue = getLocalQueue();
  queue.unshift(newQueueItem);
  saveLocalQueue(queue);

  return newQueueItem;
}

/**
 * Récupère la file d'attente d'un médecin
 */
export async function getDoctorQueue(doctorSlug: string): Promise<PatientQueueItem[]> {
  const normalizedSlug = doctorSlug.toLowerCase().trim();

  // 1. Essai Firestore
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'patient_queues'),
        where('doctorSlug', '==', normalizedSlug),
        where('status', 'in', ['waiting', 'in_consultation'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as PatientQueueItem);
      }
    } catch (e) {
      console.warn('Firebase getDoctorQueue failed, fallback:', e);
    }
  }

  // 2. Fallback Local Storage
  const queue = getLocalQueue();
  return queue.filter(q => q.doctorSlug.toLowerCase() === normalizedSlug && (q.status === 'waiting' || q.status === 'in_consultation'));
}

/**
 * Récupère les données d'un patient par ID
 */
export async function getPatientById(patientId: string): Promise<PatientQueueItem | null> {
  // 1. Essai Firestore
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'patient_queues', patientId));
      if (snap.exists()) {
        return snap.data() as PatientQueueItem;
      }
    } catch (e) {
      console.warn('Firebase getPatientById failed, fallback:', e);
    }
  }

  // 2. Fallback Local Storage
  const queue = getLocalQueue();
  const matched = queue.find(p => p.id === patientId);
  if (matched) return matched;

  const archive = getLocalArchive();
  return archive.find(p => p.id === patientId) || null;
}

/**
 * Écouteur temps réel pour un patient (messages, statut de paiement, ordonnance)
 */
export function listenToPatient(
  patientId: string,
  callback: (patient: PatientQueueItem | null) => void
): () => void {
  let isUnsubscribed = false;
  let firestoreUnsub: (() => void) | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

  function startLocalPolling() {
    if (pollInterval || isUnsubscribed) return;
    pollInterval = setInterval(() => {
      if (isUnsubscribed) return;
      try {
        const q = getLocalQueue();
        const localP = q.find(p => p.id === patientId);
        if (localP && !isUnsubscribed) {
          callback(localP);
        }
      } catch (e) {}
    }, 2000);
  }

  // Émission immédiate depuis le cache local si disponible
  const initialLocal = getLocalQueue().find(p => p.id === patientId) || getLocalArchive().find(p => p.id === patientId);
  if (initialLocal) {
    callback(initialLocal);
  }

  // 1. Abonnement Firestore Temps Réel
  if (isFirebaseConfigured && db) {
    try {
      firestoreUnsub = onSnapshot(
        doc(db, 'patient_queues', patientId),
        snap => {
          if (!isUnsubscribed && snap.exists()) {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            const data = snap.data() as PatientQueueItem;
            // Synchronisation discrète du cache local
            try {
              const q = getLocalQueue();
              const idx = q.findIndex(p => p.id === patientId);
              if (idx >= 0) {
                q[idx] = { ...q[idx], ...data };
                saveLocalQueue(q);
              }
            } catch (e) {}
            callback(data);
          }
        },
        err => {
          console.warn('Firestore onSnapshot patient notice:', err);
          startLocalPolling();
        }
      );
    } catch (e) {
      console.warn('Firestore listen exception, falling back to local poll:', e);
      startLocalPolling();
    }
  } else {
    // Mode hors-ligne sans Firebase
    startLocalPolling();
  }

  // Fonction de nettoyage
  return () => {
    isUnsubscribed = true;
    if (pollInterval) clearInterval(pollInterval);
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch (e) {}
    }
  };
}

/**
 * Écouteur temps réel pour la file d'attente du médecin
 */
export function listenToDoctorQueue(
  doctorSlug: string,
  callback: (queue: PatientQueueItem[]) => void
): () => void {
  let isUnsubscribed = false;
  let firestoreUnsub: (() => void) | null = null;
  let pollInterval: NodeJS.Timeout | null = null;
  const normalizedSlug = doctorSlug.toLowerCase().trim();

  function startLocalPolling() {
    if (pollInterval || isUnsubscribed) return;
    pollInterval = setInterval(() => {
      if (isUnsubscribed) return;
      try {
        const q = getLocalQueue();
        const items = q.filter(item => item.doctorSlug.toLowerCase() === normalizedSlug && (item.status === 'waiting' || item.status === 'in_consultation'));
        if (items.length > 0 && !isUnsubscribed) {
          callback(items);
        }
      } catch (e) {}
    }, 3000);
  }

  // 1. Abonnement Firestore Temps Réel
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'patient_queues'),
        where('doctorSlug', '==', normalizedSlug),
        where('status', 'in', ['waiting', 'in_consultation'])
      );
      firestoreUnsub = onSnapshot(
        q,
        snap => {
          if (!isUnsubscribed) {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            const items = snap.docs.map(d => d.data() as PatientQueueItem);
            callback(items);
          }
        },
        err => {
          console.warn('Firestore queue onSnapshot notice:', err);
          startLocalPolling();
        }
      );
    } catch (e) {
      console.warn('Firestore queue listen exception:', e);
      startLocalPolling();
    }
  } else {
    startLocalPolling();
  }

  return () => {
    isUnsubscribed = true;
    if (pollInterval) clearInterval(pollInterval);
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch (e) {}
    }
  };
}

function syncMessagesToLocal(patientId: string, messages: ChatMessage[]) {
  try {
    const q = getLocalQueue();
    const idx = q.findIndex(p => p.id === patientId);
    if (idx >= 0) {
      q[idx].messages = messages;
      saveLocalQueue(q);
    }
    const arch = getLocalArchive();
    const aIdx = arch.findIndex(p => p.id === patientId);
    if (aIdx >= 0) {
      arch[aIdx].messages = messages;
      saveLocalArchive(arch);
    }
  } catch (e) {}
}

/**
 * Écouteur temps réel optimisé pour les messages de consultation (Sous-collection Firestore 'messages')
 */
export function listenToConsultationMessages(
  patientId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  let isUnsubscribed = false;
  let firestoreUnsub: (() => void) | null = null;
  let pollInterval: NodeJS.Timeout | null = null;

  function startLocalPolling() {
    if (pollInterval || isUnsubscribed) return;
    pollInterval = setInterval(() => {
      if (isUnsubscribed) return;
      try {
        const q = getLocalQueue();
        const localP = q.find(p => p.id === patientId);
        if (localP && localP.messages && !isUnsubscribed) {
          callback(localP.messages);
          return;
        }
        const arch = getLocalArchive();
        const localArch = arch.find(p => p.id === patientId);
        if (localArch && localArch.messages && !isUnsubscribed) {
          callback(localArch.messages);
        }
      } catch (e) {}
    }, 2000);
  }

  // 1. Abonnement Firestore Temps Réel sur la sous-collection 'messages'
  const firestoreDb = db;
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const messagesCol = collection(firestoreDb, 'patient_queues', patientId, 'messages');

      // Écoute directe de la collection sans index d'ordre rigide (tri déterministe en mémoire JS)
      firestoreUnsub = onSnapshot(
        messagesCol,
        snap => {
          if (isUnsubscribed) return;
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          if (!snap.empty) {
            const items = snap.docs.map(d => {
              const data = d.data() as ChatMessage;
              return {
                ...data,
                id: data.id || d.id,
                timestamp: data.timestamp || (data as any).createdAt ? new Date((data as any).createdAt).toISOString() : new Date().toISOString(),
              };
            }).sort((a, b) => {
              const timeA = new Date(a.timestamp).getTime() || (a as any).createdAt || 0;
              const timeB = new Date(b.timestamp).getTime() || (b as any).createdAt || 0;
              return timeA - timeB;
            });

            syncMessagesToLocal(patientId, items);
            callback(items);
          } else {
            // Rétrocompatibilité immédiate : si la sous-collection est encore vide, lire le document parent
            getDoc(doc(firestoreDb, 'patient_queues', patientId)).then(parentSnap => {
              if (isUnsubscribed) return;
              if (parentSnap.exists()) {
                const pData = parentSnap.data() as PatientQueueItem;
                if (pData.messages && pData.messages.length > 0) {
                  const sortedParentMsgs = [...pData.messages].sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime() || (a as any).createdAt || 0;
                    const timeB = new Date(b.timestamp).getTime() || (b as any).createdAt || 0;
                    return timeA - timeB;
                  });
                  syncMessagesToLocal(patientId, sortedParentMsgs);
                  callback(sortedParentMsgs);
                }
              }
            }).catch(e => console.warn('Erreur fallback lecture parent messages:', e));
          }
        },
        err => {
          console.warn('Firestore messages onSnapshot notice:', err);
          startLocalPolling();
        }
      );
    } catch (e) {
      console.warn('Firestore messages listen exception:', e);
      startLocalPolling();
    }
  } else {
    startLocalPolling();
  }

  return () => {
    isUnsubscribed = true;
    if (pollInterval) clearInterval(pollInterval);
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch (e) {}
    }
  };
}

/**
 * Confirmation du paiement par le médecin
 */
export async function confirmPatientPayment(patientId: string): Promise<PatientQueueItem | null> {
  const sysMsg: ChatMessage = {
    id: `msg-conf-${Date.now()}`,
    sender: 'system',
    type: 'text',
    text: 'Paiement confirmé par le médecin. La salle de soin est active.',
    timestamp: new Date().toISOString()
  };

  const updates = {
    paymentConfirmedByDoctor: true,
    status: 'in_consultation' as const,
    lastMessageAt: sysMsg.timestamp,
    lastMessageText: sysMsg.text,
    lastMessageSender: 'system',
  };

  // 1. Mise à jour Firestore (parent + sous-collection)
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'patient_queues', patientId), {
        ...updates,
        messages: arrayUnion(cleanFirestoreData(sysMsg))
      });
      // Écriture également dans la sous-collection messages
      await setDoc(
        doc(db, 'patient_queues', patientId, 'messages', sysMsg.id),
        cleanFirestoreData({ ...sysMsg, createdAt: Date.now() })
      );
    } catch (e) {
      console.warn('Firebase confirmPayment failed:', e);
    }
  }

  // 2. Mise à jour locale
  const queue = getLocalQueue();
  const idx = queue.findIndex(p => p.id === patientId);
  if (idx >= 0) {
    queue[idx] = {
      ...queue[idx],
      ...updates,
      messages: [...(queue[idx].messages || []), sysMsg]
    };
    saveLocalQueue(queue);
    return queue[idx];
  }
  return null;
}

/**
 * Envoi d'un message de consultation (Texte, Audio OGG/WebM, Image, Ordonnance)
 * Enregistre dans la sous-collection Firestore 'patient_queues/{patientId}/messages'
 */
export async function sendConsultationMessage(
  patientId: string,
  message: {
    sender: 'patient' | 'doctor' | 'system';
    type?: 'text' | 'image' | 'voice' | 'prescription';
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    prescriptionData?: OfficialPrescription;
    isPrescription?: boolean;
  }
): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender: message.sender,
    type: message.type || (message.imageUrl ? 'image' : (message.audioUrl || message.audioDuration) ? 'voice' : message.prescriptionData ? 'prescription' : 'text'),
    text: message.text,
    imageUrl: message.imageUrl,
    audioUrl: message.audioUrl,
    audioDuration: message.audioDuration,
    prescriptionData: message.prescriptionData,
    timestamp: new Date().toISOString(),
    isPrescription: message.isPrescription || Boolean(message.prescriptionData),
  };

  // 1. Envoi temps réel Firestore dans la sous-collection dédiée messages et le document parent en parallèle
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, 'patient_queues', patientId, 'messages', newMsg.id);
      const parentRef = doc(db, 'patient_queues', patientId);
      const summaryText = newMsg.text || (newMsg.type === 'voice' ? 'Note vocale' : newMsg.type === 'image' ? 'Image partagée' : newMsg.type === 'prescription' ? 'Ordonnance scellée' : 'Message');
      
      const parentUpdates: any = {
        id: patientId,
        lastMessageAt: newMsg.timestamp,
        lastMessageText: summaryText,
        lastMessageSender: newMsg.sender,
        messages: arrayUnion(cleanFirestoreData(newMsg)) // Conservation pour rétrocompatibilité
      };
      if (newMsg.sender === 'patient') {
        parentUpdates.hasUnreadFollowUp = true;
      } else if (newMsg.sender === 'doctor') {
        parentUpdates.hasUnreadFollowUp = false;
      }

      // Écriture concurrente ultra-rapide
      await Promise.all([
        setDoc(msgRef, cleanFirestoreData({
          ...newMsg,
          createdAt: Date.now(),
        })),
        setDoc(parentRef, parentUpdates, { merge: true })
      ]);
    } catch (e) {
      console.warn('Firebase sendConsultationMessage failed:', e);
    }
  }

  // 2. Mise à jour Cache Local
  const queue = getLocalQueue();
  const idx = queue.findIndex(p => p.id === patientId);
  if (idx >= 0) {
    if (!queue[idx].messages) queue[idx].messages = [];
    if (!queue[idx].messages.some(m => m.id === newMsg.id)) {
      queue[idx].messages.push(newMsg);
    }
    queue[idx].lastMessageAt = newMsg.timestamp;
    queue[idx].lastMessageSender = newMsg.sender;
    if (newMsg.sender === 'patient') queue[idx].hasUnreadFollowUp = true;
    if (newMsg.sender === 'doctor') queue[idx].hasUnreadFollowUp = false;
    saveLocalQueue(queue);
  } else {
    const archive = getLocalArchive();
    const aIdx = archive.findIndex(p => p.id === patientId);
    if (aIdx >= 0) {
      if (!archive[aIdx].messages) archive[aIdx].messages = [];
      if (!archive[aIdx].messages.some(m => m.id === newMsg.id)) {
        archive[aIdx].messages.push(newMsg);
      }
      archive[aIdx].lastMessageAt = newMsg.timestamp;
      archive[aIdx].lastMessageSender = newMsg.sender;
      if (newMsg.sender === 'patient') archive[aIdx].hasUnreadFollowUp = true;
      if (newMsg.sender === 'doctor') archive[aIdx].hasUnreadFollowUp = false;
      saveLocalArchive(archive);
    }
  }

  return newMsg;
}

export async function createOfficialPrescription(prescription: OfficialPrescription): Promise<OfficialPrescription> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'prescriptions', prescription.hash), cleanFirestoreData(prescription));
    } catch (e) {
      console.warn('Firebase createOfficialPrescription notice:', e);
    }
  }

  const prescriptions = getLocalPrescriptions();
  prescriptions.unshift(prescription);
  saveLocalPrescriptions(prescriptions);
  return prescription;
}

export async function getPrescriptionByHash(hash: string): Promise<OfficialPrescription | null> {
  const normalizedHash = decodeURIComponent(hash).toLowerCase().trim();

  // 1. Essai Firestore
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'prescriptions', normalizedHash));
      if (snap.exists()) {
        return snap.data() as OfficialPrescription;
      }
    } catch (e) {
      console.warn('Firebase getPrescriptionByHash notice:', e);
    }
  }

  const prescriptions = getLocalPrescriptions();
  const found = prescriptions.find(p => p.hash.toLowerCase().trim() === normalizedHash);
  if (found) return found;

  const archive = getLocalArchive();
  const archFound = archive.find(p => p.prescription?.hash.toLowerCase().trim() === normalizedHash);
  if (archFound?.prescription) return archFound.prescription;

  const queue = getLocalQueue();
  const queueFound = queue.find(p => p.prescription?.hash.toLowerCase().trim() === normalizedHash);
  if (queueFound?.prescription) return queueFound.prescription;

  // Recherche dans les messages
  for (const item of [...queue, ...archive]) {
    if (item.messages) {
      for (const m of item.messages) {
        if (m.prescriptionData && m.prescriptionData.hash?.toLowerCase().trim() === normalizedHash) {
          return m.prescriptionData;
        }
      }
    }
  }

  return null;
}

/**
 * Délivrance d'une ordonnance en pharmacie (Verrouillage anti-fraude)
 */
export async function dispensePrescription(
  hash: string,
  pharmacyData: { pharmacyName: string; pharmacistName?: string }
): Promise<OfficialPrescription | null> {
  const normalizedHash = decodeURIComponent(hash).toLowerCase().trim();
  const cleanPharmacy = sanitizeText(pharmacyData.pharmacyName) || 'Pharmacie Partenaire';
  const cleanPharmacist = sanitizeText(pharmacyData.pharmacistName) || 'Docteur en Pharmacie';
  const timestamp = new Date().toISOString();
  
  const updates: Partial<OfficialPrescription> = {
    dispensed: true,
    dispensedAt: timestamp,
    dispensedByPharmacy: cleanPharmacy,
    dispensedPharmacistName: cleanPharmacist,
    status: 'dispensed',
  };

  // 1. Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'prescriptions', normalizedHash), updates);
      
      // Journalisation d'audit médico-légale
      const auditLog = {
        id: `audit-dispense-${Date.now()}`,
        action: 'dispense_prescription',
        targetId: normalizedHash,
        targetName: `Ordonnance délivrée par ${cleanPharmacy} (${cleanPharmacist})`,
        adminEmail: 'pharmacie.officine@telemed.sn',
        timestamp,
        details: { pharmacy: cleanPharmacy, pharmacist: cleanPharmacist, hash: normalizedHash }
      };
      await setDoc(doc(db, 'admin_audit_logs', auditLog.id), auditLog);
    } catch (e) {
      console.warn('Firebase dispensePrescription failed:', e);
    }
  }

  // 2. LocalStorage
  const prescriptions = getLocalPrescriptions();
  const pIdx = prescriptions.findIndex(p => p.hash.toLowerCase().trim() === normalizedHash);
  if (pIdx >= 0) {
    prescriptions[pIdx] = { ...prescriptions[pIdx], ...updates };
    saveLocalPrescriptions(prescriptions);
    return prescriptions[pIdx];
  }

  return null;
}

/**
 * Calcule le statut de suivi post-consultation (délai de grâce de 48h)
 */
export function getFollowUpStatus(item?: PatientQueueItem | null): {
  inFollowUp: boolean;
  remainingHours: number;
  isExpired: boolean;
  label: string;
} {
  if (!item || item.status !== 'completed') {
    return { inFollowUp: false, remainingHours: 0, isExpired: false, label: 'En consultation active' };
  }

  // Calcul basé sur followUpUntil ou completedAt + 48h
  const completedDate = item.completedAt ? new Date(item.completedAt).getTime() : 0;
  const followUpUntilTime = item.followUpUntil
    ? new Date(item.followUpUntil).getTime()
    : completedDate
    ? completedDate + 48 * 3600 * 1000
    : 0;

  if (!followUpUntilTime) {
    return { inFollowUp: false, remainingHours: 0, isExpired: true, label: 'Dossier archivé' };
  }

  const now = Date.now();
  const diffMs = followUpUntilTime - now;

  if (diffMs > 0) {
    const remainingHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return {
      inFollowUp: true,
      remainingHours,
      isExpired: false,
      label: `Suivi actif (${remainingHours}h restantes)`
    };
  }

  return {
    inFollowUp: false,
    remainingHours: 0,
    isExpired: true,
    label: 'Délai de suivi expiré'
  };
}

/**
 * Clôture et passage en suivi post-consultation (48h de délai de grâce)
 */
export async function archiveConsultationSession(
  patientId: string,
  prescription?: OfficialPrescription,
  followUpHours = 48
): Promise<PatientQueueItem | null> {
  const completedAt = new Date().toISOString();
  const followUpUntil = new Date(Date.now() + followUpHours * 3600 * 1000).toISOString();

  const completedItem: Partial<PatientQueueItem> = {
    status: 'completed',
    isReadOnly: false, // La messagerie reste active pour les questions de suivi pendant 48h
    completedAt,
    followUpUntil,
    hasUnreadFollowUp: false,
    ...(prescription ? { prescription } : {}),
  };

  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'patient_queues', patientId), cleanFirestoreData(completedItem));
    } catch (e) {
      console.warn('Firebase archiveConsultationSession failed:', e);
    }
  }

  // 2. Mise à jour Locale
  const queue = getLocalQueue();
  const idx = queue.findIndex(p => p.id === patientId);
  let itemToArchive: PatientQueueItem | undefined;

  if (idx >= 0) {
    itemToArchive = queue[idx];
    queue.splice(idx, 1);
    saveLocalQueue(queue);
  } else {
    const existingArch = getLocalArchive();
    itemToArchive = existingArch.find(p => p.id === patientId);
  }

  if (!itemToArchive) return null;

  const fullCompletedItem: PatientQueueItem = {
    ...itemToArchive,
    status: 'completed',
    isReadOnly: false,
    completedAt,
    followUpUntil,
    hasUnreadFollowUp: false,
    prescription: prescription || itemToArchive.prescription,
  };

  const archive = getLocalArchive();
  const aIdx = archive.findIndex(p => p.id === patientId);
  if (aIdx >= 0) {
    archive[aIdx] = fullCompletedItem;
  } else {
    archive.unshift(fullCompletedItem);
  }
  saveLocalArchive(archive);

  if (prescription) {
    await createOfficialPrescription(prescription);
  }

  return fullCompletedItem;
}

export async function getDoctorArchive(doctorSlug: string): Promise<PatientQueueItem[]> {
  const normalizedSlug = doctorSlug.toLowerCase().trim();
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'patient_queues'),
        where('doctorSlug', '==', normalizedSlug),
        where('status', '==', 'completed')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as PatientQueueItem);
      }
    } catch (e) {
      console.warn('Firestore getDoctorArchive notice:', e);
    }
  }
  const archive = getLocalArchive();
  return archive.filter(item => item.doctorSlug.toLowerCase() === normalizedSlug);
}

/**
 * Soumission d'un médicament personnalisé pour approbation par l'administrateur
 */
export async function submitPendingMedication(med: {
  name: string;
  dosage?: string;
  form?: string;
  duration?: string;
  doctorName: string;
  doctorId: string;
}): Promise<PendingMedication> {
  const item: PendingMedication = {
    id: `pmed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: med.name.trim(),
    dosage: med.dosage,
    form: med.form,
    duration: med.duration,
    doctorName: med.doctorName,
    doctorId: med.doctorId,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  // Sauvegarde locale de secours
  const local = getLocalPendingMeds();
  local.unshift(item);
  if (typeof window !== 'undefined') {
    localStorage.setItem('telemed_pending_meds', JSON.stringify(local));
  }

  return item;
}

export function getLocalPendingMeds(): PendingMedication[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('telemed_pending_meds');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function getPendingMedications(): Promise<PendingMedication[]> {
  return getLocalPendingMeds();
}

export async function approvePendingMedication(medId: string, drugEntry: {
  dci: string;
  brandNames: string[];
  category: string;
  ammCode: string;
  defaultForm: string;
  defaultDosage: string;
  defaultDuration: string;
  defaultChd?: string;
}): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      // Sauvegarder dans la base locale approuvée
      const raw = localStorage.getItem('telemed_custom_drugs');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(drugEntry);
      localStorage.setItem('telemed_custom_drugs', JSON.stringify(list));

      // Mettre à jour le statut local
      const local = getLocalPendingMeds();
      const idx = local.findIndex(m => m.id === medId);
      if (idx >= 0) {
        local[idx].status = 'approved';
        localStorage.setItem('telemed_pending_meds', JSON.stringify(local));
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

export async function rejectPendingMedication(medId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const local = getLocalPendingMeds();
      const idx = local.findIndex(m => m.id === medId);
      if (idx >= 0) {
        local[idx].status = 'rejected';
        localStorage.setItem('telemed_pending_meds', JSON.stringify(local));
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}
