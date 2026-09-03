'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getPatientById, getDoctorBySlug, listenToPatient } from '@/lib/services/doctorService';
import { PatientQueueItem, DoctorProfile } from '@/lib/types/doctor';
import { LiveConsultationRoom } from '@/components/doctor/LiveConsultationRoom';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Stethoscope, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DedicatedConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { doctorProfile } = useAuth();

  const [patient, setPatient] = useState<PatientQueueItem | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const unsub = listenToPatient(id, (updated) => {
      if (updated) {
        setPatient(updated);
        if (!doctor) {
          getDoctorBySlug(updated.doctorSlug).then((d) => setDoctor(d || doctorProfile));
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id, doctorProfile, doctor]);

  const activeDoc: DoctorProfile = doctor || doctorProfile || {
    id: 'doc-active-1',
    fullName: 'Dr. Ibrahima Sow',
    speciality: 'Cardiologie & Médecine Interne',
    onmsNumber: 'SN-ONMS-4829',
    clinicName: 'Cabinet Médical Al-Madina',
    city: 'Dakar',
    phone: '+221 77 654 32 10',
    slug: 'dr-sow',
    status: 'active',
    consultationFee: 7000,
    avisMedicalFee: 3000,
    visioConsultationFee: 7000,
    createdAt: new Date().toISOString(),
    availableForTeleconsult: true,
    email: 'dr.sow@telemed.sn',
    nin: '1988120400341',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[#F4F9FD]">
        <GlassCard className="p-8 text-center bg-white/80 max-w-sm shadow-xl space-y-3">
          <Stethoscope className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#0F172A]">Accès à la salle de soin...</p>
        </GlassCard>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[#F4F9FD]">
        <GlassCard className="p-8 text-center bg-white/90 max-w-md space-y-4 shadow-xl border-rose-200">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Dossier Patient Introuvable</h2>
          <p className="text-xs text-slate-500">
            La session de consultation <span className="font-mono">{id}</span> n'a pas été trouvée ou a expiré.
          </p>
          <Link href="/dashboard">
            <GlassButton variant="primary" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Retour au Tableau de Bord
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <LiveConsultationRoom
      patient={patient}
      doctor={activeDoc}
      onClose={() => router.push('/dashboard')}
    />
  );
}
