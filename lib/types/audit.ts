/**
 * Types & Modèles pour la Traçabilité Médico-Légale et les Journaux d'Audit (CDP Sénégal - Loi n° 2008-12)
 */

export type AccessAuditAction =
  | 'prescription_verified'    // Visualisation/scan d'une ordonnance sur /verify/[hash]
  | 'prescription_created'     // Signature et émission d'une ordonnance par un médecin
  | 'prescription_dispensed'   // Délivrance pharmaceutique enregistrée
  | 'consultation_start'       // Début de prise en charge en téléconsultation
  | 'consultation_end'         // Clôture de la téléconsultation
  | 'patient_queue_joined'     // Entrée du patient dans la file d'attente avec recueil du consentement
  | 'patient_data_accessed';   // Consultation du dossier patient par le praticien traitant

export type ActorType = 'doctor' | 'patient' | 'pharmacy' | 'system' | 'admin';

export type TargetType = 'prescription' | 'patient_queue' | 'doctor_profile' | 'system';

export interface AccessAuditLog {
  id: string;
  action: AccessAuditAction;
  actorType: ActorType;
  actorId: string;             // UID médecin, nom pharmacie, ou ID patient
  targetType: TargetType;
  targetId: string;            // Hash ordonnance ou ID patient_queue
  description: string;         // Libellé explicite en français
  ipAddress?: string;          // Adresse IP pseudonymisée (ex: 196.207.215.***)
  metadata?: Record<string, any>;
  timestamp: string;           // Format ISO 8601
}
