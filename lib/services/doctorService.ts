import { DoctorProfile, PatientQueueItem, ChatMessage } from '../types/doctor';
import { OfficialPrescription } from '../types/prescription';
import { db, isFirebaseConfigured } from '../firebase';
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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function createDoctorProfile(
  profileData: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'>,
  userId?: string
): Promise<DoctorProfile> {
  const id = userId || `doc-${Date.now()}`;
  const newDoctor: DoctorProfile = {
    ...profileData,
    id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    consultationFee: profileData.consultationFee || 7000,
    avisMedicalFee: profileData.avisMedicalFee || 3000,
    visioConsultationFee: profileData.visioConsultationFee || 7000,
    waveNumber: profileData.waveNumber || profileData.phone,
    omNumber: profileData.omNumber || profileData.phone,
    availableForTeleconsult: true,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'doctors', id), newDoctor);
      return newDoctor;
    } catch (e) {
      console.warn('Firebase save failed, falling back to local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  const existingIdx = doctors.findIndex(d => d.id === id || d.email === newDoctor.email);
  if (existingIdx >= 0) {
    doctors[existingIdx] = newDoctor;
  } else {
    doctors.push(newDoctor);
  }
  saveLocalDoctors(doctors);

  return newDoctor;
}

export async function getDoctorById(id: string): Promise<DoctorProfile | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'doctors', id));
      if (snap.exists()) {
        return snap.data() as DoctorProfile;
      }
    } catch (e) {
      console.warn('Firebase getDoctorById failed, using local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  return doctors.find(d => d.id === id || d.email === id) || null;
}

export async function getDoctorBySlug(slug: string): Promise<DoctorProfile | null> {
  const normalizedSlug = slug.toLowerCase().trim();
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'doctors'), where('slug', '==', normalizedSlug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as DoctorProfile;
      }
    } catch (e) {
      console.warn('Firebase getDoctorBySlug failed, using local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  return doctors.find(d => d.slug.toLowerCase() === normalizedSlug) || null;
}

export async function updateDoctorProfile(id: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile | null> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'doctors', id), updates);
    } catch (e) {
      console.warn('Firebase updateDoc failed, fallback to local storage:', e);
    }
  }

  const doctors = getLocalDoctors();
  const idx = doctors.findIndex(d => d.id === id);
  if (idx >= 0) {
    doctors[idx] = { ...doctors[idx], ...updates };
    saveLocalDoctors(doctors);
    return doctors[idx];
  }
  return null;
}

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

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'patient_queues', id), newQueueItem);
      return newQueueItem;
    } catch (e) {
      console.warn('Firebase addPatientToQueue failed, fallback to local storage:', e);
    }
  }

  const queue = getLocalQueue();
  queue.unshift(newQueueItem);
  saveLocalQueue(queue);

  return newQueueItem;
}

export async function getDoctorQueue(doctorSlug: string): Promise<PatientQueueItem[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'patient_queues'),
        where('doctorSlug', '==', doctorSlug),
        where('status', 'in', ['waiting', 'in_consultation'])
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as PatientQueueItem);
    } catch (e) {
      console.warn('Firebase getDoctorQueue failed, fallback to local storage:', e);
    }
  }

  const queue = getLocalQueue();
  return queue.filter(q => q.doctorSlug === doctorSlug && (q.status === 'waiting' || q.status === 'in_consultation'));
}

export async function getPatientById(patientId: string): Promise<PatientQueueItem | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'patient_queues', patientId));
      if (snap.exists()) {
        return snap.data() as PatientQueueItem;
      }
    } catch (e) {
      console.warn('Firebase getPatientById failed, fallback to local:', e);
    }
  }

  const queue = getLocalQueue();
  const matched = queue.find(p => p.id === patientId);
  if (matched) return matched;

  const archive = getLocalArchive();
  return archive.find(p => p.id === patientId) || null;
}

export async function confirmPatientPayment(patientId: string): Promise<PatientQueueItem | null> {
  const updates = {
    paymentConfirmedByDoctor: true,
    status: 'in_consultation' as const,
  };

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'patient_queues', patientId), updates);
    } catch (e) {
      console.warn('Firebase confirmPayment failed, fallback to local:', e);
    }
  }

  const queue = getLocalQueue();
  const idx = queue.findIndex(p => p.id === patientId);
  if (idx >= 0) {
    queue[idx] = {
      ...queue[idx],
      ...updates,
      messages: [
        ...(queue[idx].messages || []),
        {
          id: `msg-conf-${Date.now()}`,
          sender: 'system',
          type: 'text',
          text: 'Paiement confirmé par le médecin. La salle de soin est active.',
          timestamp: new Date().toISOString()
        }
      ]
    };
    saveLocalQueue(queue);
    return queue[idx];
  }
  return null;
}

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

  const queue = getLocalQueue();
  const idx = queue.findIndex(p => p.id === patientId);
  if (idx >= 0) {
    queue[idx].messages = [...(queue[idx].messages || []), newMsg];
    saveLocalQueue(queue);
  } else {
    // If already in archive, save there as well
    const archive = getLocalArchive();
    const aIdx = archive.findIndex(p => p.id === patientId);
    if (aIdx >= 0) {
      archive[aIdx].messages = [...(archive[aIdx].messages || []), newMsg];
      saveLocalArchive(archive);
    }
  }

  return newMsg;
}

export async function createOfficialPrescription(prescription: OfficialPrescription): Promise<OfficialPrescription> {
  const prescriptions = getLocalPrescriptions();
  prescriptions.unshift(prescription);
  saveLocalPrescriptions(prescriptions);
  return prescription;
}

export async function getPrescriptionByHash(hash: string): Promise<OfficialPrescription | null> {
  const prescriptions = getLocalPrescriptions();
  return prescriptions.find(p => p.hash.toLowerCase() === hash.toLowerCase().trim()) || null;
}

export async function archiveConsultationSession(
  patientId: string,
  prescription?: OfficialPrescription
): Promise<PatientQueueItem | null> {
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

  const completedItem: PatientQueueItem = {
    ...itemToArchive,
    status: 'completed',
    isReadOnly: true,
    completedAt: new Date().toISOString(),
    prescription: prescription || itemToArchive.prescription,
  };

  // Add to archive
  const archive = getLocalArchive();
  const aIdx = archive.findIndex(p => p.id === patientId);
  if (aIdx >= 0) {
    archive[aIdx] = completedItem;
  } else {
    archive.unshift(completedItem);
  }
  saveLocalArchive(archive);

  if (prescription) {
    await createOfficialPrescription(prescription);
  }

  return completedItem;
}

export async function getDoctorArchive(doctorSlug: string): Promise<PatientQueueItem[]> {
  const archive = getLocalArchive();
  return archive.filter(item => item.doctorSlug === doctorSlug);
}
