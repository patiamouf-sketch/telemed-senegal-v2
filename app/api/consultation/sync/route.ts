import { NextRequest, NextResponse } from 'next/server';
import { PatientQueueItem, ChatMessage, DoctorProfile } from '@/lib/types/doctor';
import { OfficialPrescription, PendingMedication } from '@/lib/types/prescription';
import { INITIAL_DOCTORS } from '@/lib/services/mockData';
import { addDays } from 'date-fns';

// Global in-memory shared store for serverless runtime fallback
declare global {
  var __telemedGlobalQueue: PatientQueueItem[] | undefined;
  var __telemedGlobalArchive: PatientQueueItem[] | undefined;
  var __telemedGlobalPrescriptions: OfficialPrescription[] | undefined;
  var __telemedGlobalPendingMeds: PendingMedication[] | undefined;
  var __telemedGlobalDoctors: DoctorProfile[] | undefined;
  var __telemedGlobalWebRTCSessions: Record<string, any> | undefined;
}

if (!global.__telemedGlobalQueue) {
  global.__telemedGlobalQueue = [];
}
if (!global.__telemedGlobalArchive) {
  global.__telemedGlobalArchive = [];
}
if (!global.__telemedGlobalPrescriptions) {
  global.__telemedGlobalPrescriptions = [];
}
if (!global.__telemedGlobalPendingMeds) {
  global.__telemedGlobalPendingMeds = [];
}
if (!global.__telemedGlobalDoctors) {
  global.__telemedGlobalDoctors = [...INITIAL_DOCTORS];
}
if (!global.__telemedGlobalWebRTCSessions) {
  global.__telemedGlobalWebRTCSessions = {};
}

const queue = global.__telemedGlobalQueue;
const archive = global.__telemedGlobalArchive;
const prescriptions = global.__telemedGlobalPrescriptions;
const pendingMeds = global.__telemedGlobalPendingMeds;
const doctors = global.__telemedGlobalDoctors;
const webrtcSessions = global.__telemedGlobalWebRTCSessions;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const hash = searchParams.get('hash');
  const type = searchParams.get('type');

  if (type === 'doctors') {
    return NextResponse.json({ success: true, doctors });
  }

  if (type === 'pending_meds') {
    return NextResponse.json({ success: true, pendingMeds });
  }

  if (type === 'webrtc' && id) {
    return NextResponse.json({ success: true, session: webrtcSessions[id] || null });
  }

  if (id) {
    const patient = queue.find(p => p.id === id) || archive.find(p => p.id === id) || null;
    return NextResponse.json({ success: true, patient });
  }

  if (slug) {
    const doctorQueue = queue.filter(
      p => p.doctorSlug.toLowerCase() === slug.toLowerCase() && (p.status === 'waiting' || p.status === 'in_consultation')
    );
    const doctorArchive = archive.filter(p => p.doctorSlug.toLowerCase() === slug.toLowerCase());
    return NextResponse.json({ success: true, queue: doctorQueue, archive: doctorArchive });
  }

  if (hash) {
    const targetHash = decodeURIComponent(hash).toLowerCase().trim();
    const presc =
      prescriptions.find(p => p.hash.toLowerCase().trim() === targetHash) ||
      archive.find(p => p.prescription?.hash.toLowerCase().trim() === targetHash)?.prescription ||
      queue.find(p => p.prescription?.hash.toLowerCase().trim() === targetHash)?.prescription ||
      null;
    return NextResponse.json({ success: true, prescription: presc });
  }

  return NextResponse.json({ success: true, queue, archive, doctors });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      // Inscription et mise à jour de médecin
      case 'register_doctor': {
        const docProfile: DoctorProfile = payload;
        const existsIdx = doctors.findIndex(d => d.id === docProfile.id || d.email.toLowerCase() === docProfile.email.toLowerCase());
        if (existsIdx >= 0) {
          doctors[existsIdx] = { ...doctors[existsIdx], ...docProfile };
        } else {
          doctors.unshift(docProfile);
        }
        return NextResponse.json({ success: true, doctor: docProfile });
      }

      case 'approve_doctor': {
        const { doctorId, email } = payload;
        const targetEmail = email?.toLowerCase().trim();
        const idx = doctors.findIndex(d => d.id === doctorId || (targetEmail && d.email?.toLowerCase().trim() === targetEmail));
        if (idx >= 0) {
          doctors[idx].status = 'active';
          doctors[idx].licenseExpiresAt = addDays(new Date(), 30).toISOString();
          doctors[idx].rejectionReason = undefined;
          doctors[idx].banReason = undefined;
          return NextResponse.json({ success: true, doctor: doctors[idx] });
        }
        return NextResponse.json({ success: true, message: 'Doctor approval recorded' });
      }

      case 'reject_doctor': {
        const { doctorId, email, reason } = payload;
        const targetEmail = email?.toLowerCase().trim();
        const idx = doctors.findIndex(d => d.id === doctorId || (targetEmail && d.email?.toLowerCase().trim() === targetEmail));
        if (idx >= 0) {
          doctors[idx].status = 'rejected';
          doctors[idx].rejectionReason = reason;
          return NextResponse.json({ success: true, doctor: doctors[idx] });
        }
        return NextResponse.json({ success: true, message: 'Doctor rejection recorded' });
      }

      case 'ban_doctor': {
        const { doctorId, email, reason } = payload;
        const targetEmail = email?.toLowerCase().trim();
        const idx = doctors.findIndex(d => d.id === doctorId || (targetEmail && d.email?.toLowerCase().trim() === targetEmail));
        if (idx >= 0) {
          doctors[idx].status = 'banned';
          doctors[idx].banReason = reason || 'Non-respect des règles déontologiques ou dossier non conforme';
          return NextResponse.json({ success: true, doctor: doctors[idx] });
        }
        return NextResponse.json({ success: true, message: 'Doctor ban recorded' });
      }

      case 'unban_doctor': {
        const { doctorId, email } = payload;
        const targetEmail = email?.toLowerCase().trim();
        const idx = doctors.findIndex(d => d.id === doctorId || (targetEmail && d.email?.toLowerCase().trim() === targetEmail));
        if (idx >= 0) {
          doctors[idx].status = 'active';
          doctors[idx].banReason = undefined;
          return NextResponse.json({ success: true, doctor: doctors[idx] });
        }
        return NextResponse.json({ success: true, message: 'Doctor unban recorded' });
      }

      case 'delete_doctor': {
        const { doctorId, email } = payload;
        const targetEmail = email?.toLowerCase().trim();
        const idx = doctors.findIndex(d => d.id === doctorId || (targetEmail && d.email?.toLowerCase().trim() === targetEmail));
        if (idx >= 0) {
          doctors.splice(idx, 1);
          return NextResponse.json({ success: true, message: 'Doctor deleted permanently' });
        }
        return NextResponse.json({ success: true, message: 'Doctor deletion recorded' });
      }

      case 'renew_doctor_license': {
        const { doctorId, email, days = 30 } = payload;
        const targetEmail = email?.toLowerCase().trim();
        const idx = doctors.findIndex(d => d.id === doctorId || (targetEmail && d.email?.toLowerCase().trim() === targetEmail));
        if (idx >= 0) {
          const currentExpiry = doctors[idx].licenseExpiresAt ? new Date(doctors[idx].licenseExpiresAt!) : new Date();
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          doctors[idx].status = 'active';
          doctors[idx].banReason = undefined;
          doctors[idx].licenseExpiresAt = addDays(baseDate, days).toISOString();
          return NextResponse.json({ success: true, doctor: doctors[idx] });
        }
        return NextResponse.json({ success: true, message: 'Doctor renewal recorded' });
      }

      case 'add_patient': {
        const item: PatientQueueItem = payload;
        const exists = queue.findIndex(p => p.id === item.id);
        if (exists >= 0) {
          queue[exists] = { ...queue[exists], ...item };
        } else {
          queue.unshift(item);
        }
        return NextResponse.json({ success: true, patient: item });
      }

      case 'send_message': {
        const { patientId, message } = payload;
        let matched = queue.find(p => p.id === patientId);
        if (matched) {
          if (!matched.messages) matched.messages = [];
          if (!matched.messages.some(m => m.id === message.id)) {
            matched.messages.push(message);
          }
          return NextResponse.json({ success: true, message, patient: matched });
        }

        let archMatched = archive.find(p => p.id === patientId);
        if (archMatched) {
          if (!archMatched.messages) archMatched.messages = [];
          if (!archMatched.messages.some(m => m.id === message.id)) {
            archMatched.messages.push(message);
          }
          return NextResponse.json({ success: true, message, patient: archMatched });
        }

        return NextResponse.json({ success: false, error: 'Patient session not found' }, { status: 404 });
      }

      case 'confirm_payment': {
        const { patientId } = payload;
        const idx = queue.findIndex(p => p.id === patientId);
        if (idx >= 0) {
          queue[idx].paymentConfirmedByDoctor = true;
          queue[idx].status = 'in_consultation';
          if (!queue[idx].messages) queue[idx].messages = [];
          queue[idx].messages.push({
            id: `msg-sys-conf-${Date.now()}`,
            sender: 'system',
            type: 'text',
            text: 'Paiement confirmé par le médecin. La salle de soin est active.',
            timestamp: new Date().toISOString(),
          });
          return NextResponse.json({ success: true, patient: queue[idx] });
        }
        return NextResponse.json({ success: false, error: 'Patient not found in queue' }, { status: 404 });
      }

      case 'archive_session': {
        const { patientId, prescription } = payload;
        const idx = queue.findIndex(p => p.id === patientId);
        let item: PatientQueueItem | undefined;

        if (idx >= 0) {
          item = queue[idx];
          queue.splice(idx, 1);
        } else {
          item = archive.find(p => p.id === patientId);
        }

        if (item) {
          const completed: PatientQueueItem = {
            ...item,
            status: 'completed',
            isReadOnly: true,
            completedAt: new Date().toISOString(),
            prescription: prescription || item.prescription,
          };
          const aIdx = archive.findIndex(p => p.id === patientId);
          if (aIdx >= 0) {
            archive[aIdx] = completed;
          } else {
            archive.unshift(completed);
          }
          if (prescription) {
            prescriptions.unshift(prescription);
          }
          return NextResponse.json({ success: true, patient: completed });
        }
        return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
      }

      case 'save_prescription': {
        const presc: OfficialPrescription = payload;
        const exists = prescriptions.findIndex(p => p.hash === presc.hash);
        if (exists >= 0) {
          prescriptions[exists] = presc;
        } else {
          prescriptions.unshift(presc);
        }
        return NextResponse.json({ success: true, prescription: presc });
      }

      case 'submit_pending_med': {
        const med: PendingMedication = payload;
        const exists = pendingMeds.findIndex(m => m.id === med.id || m.name.toLowerCase() === med.name.toLowerCase());
        if (exists >= 0) {
          pendingMeds[exists] = med;
        } else {
          pendingMeds.unshift(med);
        }
        return NextResponse.json({ success: true, medication: med });
      }

      case 'approve_pending_med': {
        const { medId } = payload;
        const idx = pendingMeds.findIndex(m => m.id === medId);
        if (idx >= 0) {
          pendingMeds[idx].status = 'approved';
          return NextResponse.json({ success: true, medication: pendingMeds[idx] });
        }
        return NextResponse.json({ success: false, error: 'Medication not found' }, { status: 404 });
      }

      case 'reject_pending_med': {
        const { medId } = payload;
        const idx = pendingMeds.findIndex(m => m.id === medId);
        if (idx >= 0) {
          pendingMeds[idx].status = 'rejected';
          return NextResponse.json({ success: true, medication: pendingMeds[idx] });
        }
        return NextResponse.json({ success: false, error: 'Medication not found' }, { status: 404 });
      }

      // Signalisation WebRTC P2P
      case 'webrtc_signal': {
        const { patientId, type, signal } = payload;
        if (!webrtcSessions[patientId]) {
          webrtcSessions[patientId] = {};
        }
        webrtcSessions[patientId][type] = signal;
        webrtcSessions[patientId].updatedAt = new Date().toISOString();
        return NextResponse.json({ success: true, session: webrtcSessions[patientId] });
      }

      case 'webrtc_candidate': {
        const { patientId, isCaller, candidate } = payload;
        if (!webrtcSessions[patientId]) {
          webrtcSessions[patientId] = {};
        }
        const field = isCaller ? 'doctorCandidates' : 'patientCandidates';
        if (!webrtcSessions[patientId][field]) {
          webrtcSessions[patientId][field] = [];
        }
        webrtcSessions[patientId][field].push(candidate);
        webrtcSessions[patientId].updatedAt = new Date().toISOString();
        return NextResponse.json({ success: true, session: webrtcSessions[patientId] });
      }

      // Délivrance d'ordonnance en pharmacie
      case 'dispense_prescription': {
        const { hash, pharmacyName, pharmacistName } = payload;
        const targetHash = decodeURIComponent(hash).toLowerCase().trim();
        const presc =
          prescriptions.find(p => p.hash.toLowerCase().trim() === targetHash) ||
          archive.find(p => p.prescription?.hash.toLowerCase().trim() === targetHash)?.prescription ||
          queue.find(p => p.prescription?.hash.toLowerCase().trim() === targetHash)?.prescription;

        if (presc) {
          presc.dispensed = true;
          presc.dispensedAt = new Date().toISOString();
          presc.dispensedByPharmacy = pharmacyName || 'Pharmacie Partenaire';
          presc.dispensedPharmacistName = pharmacistName || 'Docteur en Pharmacie';
          return NextResponse.json({ success: true, prescription: presc });
        }
        return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
