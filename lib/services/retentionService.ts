/**
 * Service de Gestion du Cycle de Vie & Rétention des Données (CDP Sénégal - Loi n° 2008-12)
 * 
 * Objectifs réglementaires :
 * 1. Purge des messages temporaires (audio, texte) pour les consultations archivées dont le suivi est échu (> 24h).
 * 2. Purge des sessions résiduelles de signalisation WebRTC (> 2h).
 * 3. PRÉSERVATION ABSOLUE DES ORDONNANCES MÉDICALES SCELLÉES (Durée légale de 10 ans).
 * 4. Traçabilité complète de chaque cycle de nettoyage dans le journal d'audit.
 */

import { db, isFirebaseConfigured } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { getLocalArchive, saveLocalArchive } from './mockData';
import { PatientQueueItem } from '../types/doctor';

export interface RetentionCycleResult {
  success: boolean;
  purgedQueuesCount: number;
  purgedMessagesCount: number;
  purgedRtcCount: number;
  timestamp: string;
  details: string;
}

/**
 * Purge les messages et flux audio/image temporaires des téléconsultations dont le délai de suivi est échu.
 * L'ordonnance scellée, le nom du patient et le motif sont scrupuleusement conservés.
 */
export async function purgeEphemeralConsultationMessages(): Promise<{
  purgedQueuesCount: number;
  purgedMessagesCount: number;
}> {
  let purgedQueuesCount = 0;
  let purgedMessagesCount = 0;
  const now = new Date().getTime();

  // 1. Purge dans Cloud Firestore
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'patient_queues'),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);

      for (const queueDoc of snapshot.docs) {
        const data = queueDoc.data() as PatientQueueItem;
        const followUpUntilTime = data.followUpUntil ? new Date(data.followUpUntil).getTime() : 0;
        const completedAtTime = data.completedAt ? new Date(data.completedAt).getTime() : 0;

        // Éligible si le délai de grâce de suivi (24h/48h) est dépassé ou si la consultation date de plus de 24h
        const isFollowUpExpired = followUpUntilTime > 0 ? now > followUpUntilTime : (now - completedAtTime > 24 * 3600 * 1000);

        if (isFollowUpExpired) {
          // A. Nettoyage de la sous-collection messages
          try {
            const messagesSnap = await getDocs(collection(db, 'patient_queues', queueDoc.id, 'messages'));
            if (!messagesSnap.empty) {
              for (const msgDoc of messagesSnap.docs) {
                await deleteDoc(msgDoc.ref);
                purgedMessagesCount++;
              }
            }
          } catch (msgErr) {
            console.warn('Notice suppression sous-collection messages:', msgErr);
          }

          // B. Nettoyage du tableau messages dans le document parent tout en préservant l'ordonnance
          if (data.messages && data.messages.length > 0) {
            await updateDoc(doc(db, 'patient_queues', queueDoc.id), {
              messages: [],
              isMessagesPurged: true,
              messagesPurgedAt: new Date().toISOString(),
            });
            purgedQueuesCount++;
          }
        }
      }
    } catch (err) {
      console.warn('Erreur Firestore purgeEphemeralConsultationMessages:', err);
    }
  }

  // 2. Nettoyage dans l'archive locale
  if (typeof window !== 'undefined') {
    try {
      const archive = getLocalArchive();
      let modified = false;

      const cleanedArchive = archive.map((item) => {
        const followUpUntilTime = item.followUpUntil ? new Date(item.followUpUntil).getTime() : 0;
        const completedAtTime = item.completedAt ? new Date(item.completedAt).getTime() : 0;
        const isExpired = followUpUntilTime > 0 ? now > followUpUntilTime : (now - completedAtTime > 24 * 3600 * 1000);

        if (isExpired && item.messages && item.messages.length > 0) {
          modified = true;
          purgedMessagesCount += item.messages.length;
          purgedQueuesCount++;
          return {
            ...item,
            messages: [],
            isMessagesPurged: true,
            messagesPurgedAt: new Date().toISOString(),
          };
        }
        return item;
      });

      if (modified) {
        saveLocalArchive(cleanedArchive);
      }
    } catch (localErr) {
      console.warn('Notice archive locale purge:', localErr);
    }
  }

  return { purgedQueuesCount, purgedMessagesCount };
}

/**
 * Supprime les sessions WebRTC orphelines de plus de 2 heures
 */
export async function purgeStaleWebRtcSessions(olderThanHours = 2): Promise<{ purgedRtcCount: number }> {
  let purgedRtcCount = 0;
  const cutoffTime = Date.now() - olderThanHours * 3600 * 1000;

  if (isFirebaseConfigured && db) {
    try {
      const rtcSnap = await getDocs(collection(db, 'webrtc_sessions'));
      for (const rtcDoc of rtcSnap.docs) {
        const data = rtcDoc.data();
        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
        const updatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        const lastActive = Math.max(createdAt, updatedAt);

        // Si la session est inactive depuis plus de 2h ou fermée
        if (lastActive === 0 || lastActive < cutoffTime || data.status === 'closed') {
          await deleteDoc(rtcDoc.ref);
          purgedRtcCount++;
        }
      }
    } catch (err) {
      console.warn('Erreur Firestore purgeStaleWebRtcSessions:', err);
    }
  }

  return { purgedRtcCount };
}

/**
 * Exécute le cycle complet de rétention des données conforme CDP avec consignation au journal d'audit
 */
export async function executeDataRetentionCycle(
  adminEmail: string = 'dr.thiam@telemed.sn'
): Promise<RetentionCycleResult> {
  const timestamp = new Date().toISOString();

  // 1. Exécution des purges
  const { purgedQueuesCount, purgedMessagesCount } = await purgeEphemeralConsultationMessages();
  const { purgedRtcCount } = await purgeStaleWebRtcSessions(2);

  const details = `Cycle de rétention CDP exécuté : ${purgedMessagesCount} messages éphémères purgés sur ${purgedQueuesCount} dossiers de téléconsultation terminés. ${purgedRtcCount} sessions WebRTC orphelines nettoyées. 100% des ordonnances scellées (10 ans) préservées.`;

  // 2. Enregistrement dans le journal d'audit administratif
  if (isFirebaseConfigured && db) {
    try {
      const auditId = `audit-retention-${Date.now()}`;
      await setDoc(doc(db, 'admin_audit_logs', auditId), {
        id: auditId,
        action: 'cdp_data_retention_cycle',
        adminEmail,
        adminName: 'Dr. Elhadji Pathé THIAM (Admin)',
        targetId: 'cdp_retention_job',
        targetName: 'Cycle Rétention Données Éphémères CDP',
        targetType: 'system',
        timestamp,
        details,
        metadata: {
          purgedQueuesCount,
          purgedMessagesCount,
          purgedRtcCount,
        },
      });
    } catch (auditErr) {
      console.warn('Notice enregistrement audit rétention:', auditErr);
    }
  }

  return {
    success: true,
    purgedQueuesCount,
    purgedMessagesCount,
    purgedRtcCount,
    timestamp,
    details,
  };
}
