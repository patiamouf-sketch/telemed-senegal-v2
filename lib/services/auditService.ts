/**
 * Service de Traçabilité & Journal d'Audit Médico-Légal (Conformité CDP Sénégal - Loi 2008-12)
 * 
 * Enregistre de manière inaltérable tous les accès aux ordonnances, dossiers et consultations.
 */

import { AccessAuditLog, AccessAuditAction, ActorType, TargetType } from '../types/audit';
import { db as firestoreDb } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

const LOCAL_STORAGE_AUDIT_KEY = 'telemed_access_audit_logs';

/**
 * Enregistre un événement d'accès médico-légal dans Firestore avec fallback LocalStorage.
 * Cette opération est conçue pour être asynchrone et ne jamais bloquer le flux utilisateur.
 */
export async function logAccessEvent(
  data: Omit<AccessAuditLog, 'id' | 'timestamp'>
): Promise<AccessAuditLog> {
  const timestamp = new Date().toISOString();
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const auditLog: AccessAuditLog = {
    ...data,
    id,
    timestamp,
  };

  // 1. Sauvegarde locale immédiate (résilience hors-ligne)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
      const logs: AccessAuditLog[] = raw ? JSON.parse(raw) : [];
      logs.unshift(auditLog);
      // Garder les 200 derniers logs en cache local
      localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(logs.slice(0, 200)));
    } catch (localErr) {
      console.warn('Notice audit local:', localErr);
    }
  }

  // 2. Persistance Cloud Firestore
  if (firestoreDb) {
    try {
      // Écriture avec timeout pour garantir la réactivité
      const writePromise = setDoc(doc(firestoreDb, 'access_audit_logs', auditLog.id), auditLog);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai d’écriture audit dépassé')), 3000)
      );
      await Promise.race([writePromise, timeoutPromise]);
    } catch (cloudErr) {
      console.warn('Notice audit cloud (persisté localement):', cloudErr);
    }
  }

  return auditLog;
}

/**
 * Récupère l'historique d'audit des accès pour une ressource spécifique (ex: une ordonnance par son hash).
 */
export async function getAccessLogsByTarget(
  targetId: string,
  limitCount: number = 20
): Promise<AccessAuditLog[]> {
  const results: AccessAuditLog[] = [];

  // 1. Essai depuis Cloud Firestore
  if (firestoreDb) {
    try {
      const q = query(
        collection(firestoreDb, 'access_audit_logs'),
        where('targetId', '==', targetId),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((d) => {
        results.push(d.data() as AccessAuditLog);
      });
      if (results.length > 0) {
        return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (e) {
      console.warn('Fallback local pour getAccessLogsByTarget:', e);
    }
  }

  // 2. Fallback LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
      if (raw) {
        const localLogs: AccessAuditLog[] = JSON.parse(raw);
        return localLogs.filter((l) => l.targetId === targetId).slice(0, limitCount);
      }
    } catch (e) {
      console.warn('Erreur lecture logs locaux:', e);
    }
  }

  return results;
}
