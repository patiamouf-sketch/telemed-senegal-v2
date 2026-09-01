import { NextRequest, NextResponse } from 'next/server';
import { PatientQueueItem, ChatMessage } from '@/lib/types/doctor';
import { OfficialPrescription } from '@/lib/types/prescription';

// Global in-memory shared store for serverless runtime fallback
declare global {
  var __telemedGlobalQueue: PatientQueueItem[] | undefined;
  var __telemedGlobalArchive: PatientQueueItem[] | undefined;
  var __telemedGlobalPrescriptions: OfficialPrescription[] | undefined;
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

const queue = global.__telemedGlobalQueue;
const archive = global.__telemedGlobalArchive;
const prescriptions = global.__telemedGlobalPrescriptions;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const hash = searchParams.get('hash');

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
    const presc = prescriptions.find(p => p.hash.toLowerCase() === hash.toLowerCase().trim()) || null;
    return NextResponse.json({ success: true, prescription: presc });
  }

  return NextResponse.json({ success: true, queue, archive });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
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
          // Avoid duplicate msg IDs
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

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
