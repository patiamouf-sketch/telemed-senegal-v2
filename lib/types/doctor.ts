import { OfficialPrescription } from './prescription';

export type DoctorStatus = 'pending' | 'active' | 'rejected' | 'banned' | 'blocked';

export type ServiceType = 'avis_medical' | 'visio_consultation';

export interface DoctorProfile {
  id: string;
  fullName: string;
  email: string;
  speciality: string;
  onmsStatus?: 'registered' | 'unregistered'; // Inscrit ou Non encore inscrit à l'ONMS
  onmsNumber?: string; // Numéro Ordre National des Médecins du Sénégal (optionnel si non inscrit)
  nin: string;        // Numéro d'Identification Nationale du médecin
  phone: string;      // Numéro principal
  waveNumber?: string; // Numéro Wave
  omNumber?: string;   // Numéro Orange Money
  clinicName?: string;
  city?: string;
  slug: string;       // Utilisé pour la route /dr/[slug]
  status: DoctorStatus;
  rejectionReason?: string;
  banReason?: string;
  licenseExpiresAt?: string; // ISO date string (ex: +30 jours)
  createdAt: string;
  consultationFee: number;
  avisMedicalFee: number; // Prix Avis Médical (Messagerie/Audio), ex: 3000 FCFA
  visioConsultationFee: number; // Prix Visio Consultation (Vidéo), ex: 7000 FCFA
  bio?: string;
  avatarUrl?: string; // Photo de profil HD
  signatureStampUrl?: string; // Cachet + Signature numérisés
  verificationDocumentUrl?: string; // Photo de la Carte ONMS ou Photo de la CNI / Passeport
  verificationDocumentType?: 'onms_card' | 'id_card'; // Type de pièce justificative
  availableForTeleconsult: boolean;
  rating?: number;
  consultationsCount?: number;
}

export type MessageType = 'text' | 'image' | 'voice' | 'prescription';

export interface ChatMessage {
  id: string;
  sender: 'patient' | 'doctor' | 'system';
  type?: MessageType;
  text?: string;
  imageUrl?: string;
  audioUrl?: string; // URL ou dataURI audio WebM/OGG
  audioDuration?: number; // en secondes pour les notes vocales
  prescriptionData?: OfficialPrescription;
  timestamp: string;
  isPrescription?: boolean;
}

export interface PatientQueueItem {
  id: string;
  doctorSlug: string;
  patientName: string;
  patientNin?: string; // Optionnel
  patientPhone: string;
  age: number;
  gender: 'M' | 'F';
  forWho?: 'self' | 'other';
  beneficiaryName?: string;
  beneficiaryAge?: number;
  beneficiaryGender?: 'M' | 'F';
  beneficiaryAddress?: string;
  beneficiaryWeight?: string;
  serviceType: ServiceType; // 'avis_medical' | 'visio_consultation'
  amountPaid: number; // Montant en FCFA
  paymentMethod: 'wave' | 'orange_money';
  paymentDeclared: boolean;
  paymentConfirmedByDoctor: boolean;
  reason: string;
  urgency: 'normale' | 'urgente' | 'suivi';
  status: 'waiting' | 'in_consultation' | 'completed' | 'cancelled';
  isReadOnly?: boolean; // Mode lecture seule après clôture
  joinedAt: string;
  completedAt?: string;
  roomId?: string;
  notes?: string;
  messages?: ChatMessage[];
  prescription?: OfficialPrescription;
}

export interface AdminStats {
  totalDoctors: number;
  pendingCount: number;
  activeCount: number;
  rejectedCount: number;
  activePatientsToday: number;
}
