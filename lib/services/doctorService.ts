import { DoctorProfile, PatientQueueItem, ChatMessage } from '../types/doctor';
import { OfficialPrescription, PendingMedication } from '../types/prescription';
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
  arrayUnion
} from 'firebase/firestore';

/**
 * Création ou mise à jour d'un profil médecin (Actif immédiatement avec 90 jours d'accès gratuit)
 */
export async function createDoctorProfile(
  profileData: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'>,
  userId?: string
): Promise<DoctorProfile> {
  const id = userId || `doc-${Date.now()}`;
  const licenseExpiresAt = profileData.licenseExpiresAt || addDays(new Date(), 90).toISOString();
  const newDoctor: DoctorProfile = {
    ...profileData,
    id,
    status: 'active', // Immédiatement actif pour supprimer tout blocage d'attente
    licenseExpiresAt,
    createdAt: new Date().toISOString(),
    consultationFee: profileData.consultationFee || 7000,
    avisMedicalFee: profileData.avisMedicalFee || 3000,
    visioConsultationFee: profileData.visioConsultationFee || 7000,
    waveNumber: profileData.waveNumber || profileData.phone,
    omNumber: profileData.omNumber || profileData.phone,
    availableForTeleconsult: true,
  };

  // 1. Enregistrement Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'doctors', id), newDoctor);
    } catch (e) {
      console.warn('Firebase save failed, falling back to API sync:', e);
    }
  }

  // 2. Enregistrement API Serverless universelle (synchronisation temps réel multi-appareils)
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_doctor', payload: newDoctor })
      }).catch(e => {});
    } catch (e) {}
  }

  // 3. Enregistrement LocalStorage
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
    const incomingStatus = docData.status;
    const isExplicitlyBlocked = incomingStatus === 'banned' || incomingStatus === 'blocked' || incomingStatus === 'rejected';
    const finalStatus = isExplicitlyBlocked ? incomingStatus : 'active';
    const finalLicense = docData.licenseExpiresAt || addDays(new Date(), 90).toISOString();

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

  // 1. FIRESTORE DATABASE DIRECT
  if (isFirebaseConfigured && db) {
    try {
      // Essai A : Recherche directe par Document ID
      const docRef = doc(db, 'doctors', cleanId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        candidate = snap.data() as DoctorProfile;
      }

      // Essai B : Si pas trouvé ou si statut n'est pas actif, recherche par Email
      if (!candidate || candidate.status !== 'active') {
        const qEmail = query(collection(db, 'doctors'), where('email', '==', lowerId));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          const docData = emailSnap.docs[0].data() as DoctorProfile;
          if (!candidate || docData.status === 'active') {
            candidate = docData;
          }
        }
      }

      // Essai C : Si toujours pas trouvé, recherche par champ id
      if (!candidate) {
        const qId = query(collection(db, 'doctors'), where('id', '==', cleanId));
        const idSnap = await getDocs(qId);
        if (!idSnap.empty) {
          candidate = idSnap.docs[0].data() as DoctorProfile;
        }
      }
    } catch (e) {
      console.warn('Firebase getDoctorById notice:', e);
    }
  }

  // 2. API SERVERLESS CLOUD (SYNCHRONISATION MULTI-POSTES / MULTI-APPAREILS)
  // Toujours interroger l'API Cloud si candidate n'est pas actif, pour capter la validation de l'Admin en temps réel
  if (typeof window !== 'undefined' && (!candidate || candidate.status !== 'active')) {
    try {
      const res = await fetch('/api/consultation/sync?type=doctors');
      if (res.ok) {
        const data = await res.json();
        if (data.doctors && Array.isArray(data.doctors)) {
          const match = data.doctors.find((d: DoctorProfile) =>
            d.id === cleanId || d.email?.toLowerCase() === lowerId || (cleanId.includes('@') && d.email?.toLowerCase() === cleanId.toLowerCase())
          );
          if (match) {
            if (!candidate || match.status === 'active') {
              candidate = match;
            }
          }
        }
      }
    } catch (e) {}
  }

  // 3. CACHE LOCAL
  const doctors = getLocalDoctors();
  const matchedLocal = doctors.find(d => d.id === cleanId || d.email.toLowerCase() === lowerId);
  if (matchedLocal) {
    if (!candidate) {
      candidate = matchedLocal;
    } else if (matchedLocal.status === 'active' && candidate.status !== 'active') {
      candidate = { ...candidate, status: 'active', licenseExpiresAt: matchedLocal.licenseExpiresAt };
    }
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

  // Écouteur en direct Firestore si configuré
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, 'doctors', clean);
      const unsubDoc = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as DoctorProfile;
          syncDoctorToLocal(profile);
          callback(profile);
        } else {
          // Si le doc porte un nom différent, recherche par email
          const q = query(collection(firestoreDb, 'doctors'), where('email', '==', lower));
          getDocs(q).then((snap) => {
            if (!snap.empty) {
              const p = snap.docs[0].data() as DoctorProfile;
              syncDoctorToLocal(p);
              callback(p);
            }
          }).catch(() => {});
        }
      }, (err) => {
        console.warn('listenToDoctorProfile error:', err);
      });

      return () => unsubDoc();
    } catch (e) {
      console.warn('listenToDoctorProfile setup notice:', e);
    }
  }

  // Polling de secours toutes les 3s
  const interval = setInterval(async () => {
    const p = await getDoctorById(clean);
    if (p) callback(p);
  }, 3000);
  return () => clearInterval(interval);
}

export async function getDoctorBySlug(slug: string): Promise<DoctorProfile | null> {
  if (!slug) return null;
  const normalizedSlug = slug.toLowerCase().trim().replace(/^dr\.?\s*/i, 'dr-').replace(/^-+|-+$/g, '');

  let candidate: DoctorProfile | null = null;

  // 1. FIRESTORE DATABASE DIRECT
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'doctors'), where('slug', '==', normalizedSlug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        candidate = snap.docs[0].data() as DoctorProfile;
      }

      if (!candidate) {
        const qId = query(collection(db, 'doctors'), where('id', '==', normalizedSlug));
        const idSnap = await getDocs(qId);
        if (!idSnap.empty) {
          candidate = idSnap.docs[0].data() as DoctorProfile;
        }
      }
    } catch (e) {
      console.warn('Firebase getDoctorBySlug notice:', e);
    }
  }

  // 2. API SERVERLESS CLOUD (SYNCHRONISATION MULTI-POSTES EN TEMPS RÉEL)
  if (typeof window !== 'undefined' && (!candidate || candidate.status !== 'active')) {
    try {
      const res = await fetch('/api/consultation/sync?type=doctors');
      if (res.ok) {
        const data = await res.json();
        if (data.doctors && Array.isArray(data.doctors)) {
          const match = data.doctors.find((d: DoctorProfile) =>
            d.slug?.toLowerCase().trim() === normalizedSlug ||
            d.id?.toLowerCase() === normalizedSlug ||
            d.slug?.toLowerCase().replace(/^dr\.?\s*/i, 'dr-') === normalizedSlug
          );
          if (match) {
            if (!candidate || match.status === 'active') {
              candidate = match;
            }
          }
        }
      }
    } catch (e) {}
  }

  // 3. CACHE LOCAL
  const doctors = getLocalDoctors();
  const matchedLocal = doctors.find(d =>
    d.slug?.toLowerCase().trim() === normalizedSlug ||
    d.id?.toLowerCase() === normalizedSlug ||
    d.slug?.toLowerCase().replace(/^dr\.?\s*/i, 'dr-') === normalizedSlug
  );
  if (matchedLocal) {
    if (!candidate) {
      candidate = matchedLocal;
    } else if (matchedLocal.status === 'active' && candidate.status !== 'active') {
      candidate = { ...candidate, status: 'active', licenseExpiresAt: matchedLocal.licenseExpiresAt };
    }
  }

  if (candidate) {
    syncDoctorToLocal(candidate);
  }

  return candidate;
}

export async function updateDoctorProfile(id: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile | null> {
  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'doctors', id), updates, { merge: true });
    } catch (e) {
      console.warn('Firebase setDoc notice:', e);
    }
  }

  // 2. Mise à jour API Serverless Cloud
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_doctor', payload: { id, ...updates } })
      }).catch(e => {});
    } catch (e) {}
  }

  // 3. Mise à jour LocalStorage et Session active
  const doctors = getLocalDoctors();
  const idx = doctors.findIndex(d => d.id === id);
  let updated: DoctorProfile | null = null;
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    updated = doctors[idx];
  }

  if (typeof window !== 'undefined') {
    try {
      const savedSession = localStorage.getItem('telemed_session_v2');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.profile?.id === id || parsed.user?.uid === id) {
          parsed.profile = { ...parsed.profile, ...updates };
          localStorage.setItem('telemed_session_v2', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }

  return updated;
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
      await setDoc(doc(db, 'patient_queues', id), newQueueItem);
    } catch (e) {
      console.warn('Firebase addPatientToQueue failed, using API sync:', e);
    }
  }

  // 2. Synchronisation API Serverless Vercel
  try {
    if (typeof window !== 'undefined') {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_patient', payload: newQueueItem }),
      }).catch(e => console.warn('API sync add_patient notice:', e));
    }
  } catch (e) {
    console.warn('Sync API exception:', e);
  }

  // 3. Cache local
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

  // 2. Essai API Serverless
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/consultation/sync?slug=${encodeURIComponent(normalizedSlug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.queue && data.queue.length > 0) {
          return data.queue;
        }
      }
    } catch (e) {
      console.warn('API sync getDoctorQueue notice:', e);
    }
  }

  // 3. Fallback Local Storage
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

  // 2. Essai API Serverless
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/consultation/sync?id=${encodeURIComponent(patientId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.patient) {
          return data.patient;
        }
      }
    } catch (e) {
      console.warn('API sync getPatientById notice:', e);
    }
  }

  // 3. Fallback Local Storage
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

  // 1. Abonnement Firestore Temps Réel
  if (isFirebaseConfigured && db) {
    try {
      firestoreUnsub = onSnapshot(
        doc(db, 'patient_queues', patientId),
        snap => {
          if (!isUnsubscribed && snap.exists()) {
            callback(snap.data() as PatientQueueItem);
          }
        },
        err => console.warn('Firestore onSnapshot notice:', err)
      );
    } catch (e) {
      console.warn('Firestore listen exception, falling back to API poll:', e);
    }
  }

  // 2. Polling API Serverless régulier pour garantir la synchronisation multi-appareils
  const interval = setInterval(async () => {
    if (isUnsubscribed) return;
    try {
      const res = await fetch(`/api/consultation/sync?id=${encodeURIComponent(patientId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.patient && !isUnsubscribed) {
          callback(data.patient);
        }
      }
    } catch (e) {
      // Silently continue
    }
  }, 2000);

  // Fonction de nettoyage
  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
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
  const normalizedSlug = doctorSlug.toLowerCase().trim();

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
            const items = snap.docs.map(d => d.data() as PatientQueueItem);
            callback(items);
          }
        },
        err => console.warn('Firestore queue onSnapshot notice:', err)
      );
    } catch (e) {
      console.warn('Firestore queue listen exception:', e);
    }
  }

  // 2. Polling API Serverless régulier de secours
  const interval = setInterval(async () => {
    if (isUnsubscribed) return;
    try {
      const res = await fetch(`/api/consultation/sync?slug=${encodeURIComponent(normalizedSlug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.queue && !isUnsubscribed) {
          callback(data.queue);
        }
      }
    } catch (e) {
      // Silently continue
    }
  }, 2500);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
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
  };

  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'patient_queues', patientId), {
        ...updates,
        messages: arrayUnion(sysMsg)
      });
    } catch (e) {
      console.warn('Firebase confirmPayment failed:', e);
    }
  }

  // 2. Mise à jour API Serverless
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment', payload: { patientId } })
      }).catch(e => console.warn('API confirmPayment error:', e));
    } catch (e) {}
  }

  // 3. Mise à jour locale
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

  // 1. Envoi temps réel Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'patient_queues', patientId), {
        messages: arrayUnion(newMsg)
      });
    } catch (e) {
      console.warn('Firebase sendConsultationMessage failed:', e);
    }
  }

  // 2. Envoi API Serverless Vercel
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          payload: { patientId, message: newMsg }
        })
      }).catch(e => console.warn('API send_message notice:', e));
    } catch (e) {}
  }

  // 3. Mise à jour Cache Local
  const queue = getLocalQueue();
  const idx = queue.findIndex(p => p.id === patientId);
  if (idx >= 0) {
    if (!queue[idx].messages) queue[idx].messages = [];
    if (!queue[idx].messages.some(m => m.id === newMsg.id)) {
      queue[idx].messages.push(newMsg);
    }
    saveLocalQueue(queue);
  } else {
    const archive = getLocalArchive();
    const aIdx = archive.findIndex(p => p.id === patientId);
    if (aIdx >= 0) {
      if (!archive[aIdx].messages) archive[aIdx].messages = [];
      if (!archive[aIdx].messages.some(m => m.id === newMsg.id)) {
        archive[aIdx].messages.push(newMsg);
      }
      saveLocalArchive(archive);
    }
  }

  return newMsg;
}

export async function createOfficialPrescription(prescription: OfficialPrescription): Promise<OfficialPrescription> {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'prescriptions', prescription.hash), prescription);
    } catch (e) {
      console.warn('Firebase createOfficialPrescription notice:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_prescription', payload: prescription })
      }).catch(e => {});
    } catch (e) {}
  }

  const prescriptions = getLocalPrescriptions();
  prescriptions.unshift(prescription);
  saveLocalPrescriptions(prescriptions);
  return prescription;
}

export async function getPrescriptionByHash(hash: string): Promise<OfficialPrescription | null> {
  const normalizedHash = decodeURIComponent(hash).toLowerCase().trim();

  // 1. Essai API Serverless (Partagé entre tous les appareils)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/consultation/sync?hash=${encodeURIComponent(normalizedHash)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.prescription) {
          return data.prescription;
        }
      }
    } catch (e) {}
  }

  // 2. Essai Firestore
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

  // 3. Fallback Local Storage (Prescriptions, Archives et Files d'attente)
  const prescriptions = getLocalPrescriptions();
  const found = prescriptions.find(p => p.hash.toLowerCase().trim() === normalizedHash);
  if (found) return found;

  const archive = getLocalArchive();
  const archFound = archive.find(p => p.prescription?.hash.toLowerCase().trim() === normalizedHash);
  if (archFound?.prescription) return archFound.prescription;

  const queue = getLocalQueue();
  const queueFound = queue.find(p => p.prescription?.hash.toLowerCase().trim() === normalizedHash);
  if (queueFound?.prescription) return queueFound.prescription;

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
  const timestamp = new Date().toISOString();
  const updates: Partial<OfficialPrescription> = {
    dispensed: true,
    dispensedAt: timestamp,
    dispensedByPharmacy: pharmacyData.pharmacyName,
    dispensedPharmacistName: pharmacyData.pharmacistName || 'Docteur en Pharmacie',
    status: 'dispensed',
  };

  // 1. Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'prescriptions', normalizedHash), updates);
    } catch (e) {
      console.warn('Firebase dispensePrescription failed:', e);
    }
  }

  // 2. API Sync
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispense_prescription',
          payload: {
            hash: normalizedHash,
            pharmacyName: pharmacyData.pharmacyName,
            pharmacistName: pharmacyData.pharmacistName,
          },
        }),
      });
    } catch (e) {}
  }

  // 3. LocalStorage
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
 * Clôture et archivage de la session de consultation
 */
export async function archiveConsultationSession(
  patientId: string,
  prescription?: OfficialPrescription
): Promise<PatientQueueItem | null> {
  const completedItem: Partial<PatientQueueItem> = {
    status: 'completed',
    isReadOnly: true,
    completedAt: new Date().toISOString(),
    prescription,
  };

  // 1. Mise à jour Firestore
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'patient_queues', patientId), completedItem);
    } catch (e) {
      console.warn('Firebase archiveConsultationSession failed:', e);
    }
  }

  // 2. Mise à jour API Serverless
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive_session',
          payload: { patientId, prescription }
        })
      }).catch(e => {});
    } catch (e) {}
  }

  // 3. Mise à jour Locale
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
    isReadOnly: true,
    completedAt: new Date().toISOString(),
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
  const archive = getLocalArchive();
  return archive.filter(item => item.doctorSlug.toLowerCase() === doctorSlug.toLowerCase());
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

  if (typeof window !== 'undefined') {
    try {
      fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_pending_med', payload: item }),
      }).catch(e => {});

      // Sauvegarde locale de secours
      const local = getLocalPendingMeds();
      local.unshift(item);
      localStorage.setItem('telemed_pending_meds', JSON.stringify(local));
    } catch (e) {}
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
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/consultation/sync?type=pending_meds');
      if (res.ok) {
        const data = await res.json();
        if (data.pendingMeds && data.pendingMeds.length > 0) {
          return data.pendingMeds;
        }
      }
    } catch (e) {}
  }
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

      // Mettre à jour le statut dans l'API sync
      await fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_pending_med', payload: { medId } }),
      });

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
      await fetch('/api/consultation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_pending_med', payload: { medId } }),
      });

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
