'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getPrescriptionByHash } from '@/lib/services/doctorService';
import { OfficialPrescription } from '@/lib/types/prescription';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Printer,
  Copy,
  Check,
  Stethoscope,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Heart,
  Activity
} from 'lucide-react';
import Link from 'next/link';

export default function VerifyPrescriptionPage() {
  const params = useParams();
  const hash = (params?.hash as string) || '';

  const [prescription, setPrescription] = useState<OfficialPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPrescription() {
      if (!hash) return;
      setLoading(true);
      const res = await getPrescriptionByHash(hash);
      setPrescription(res);
      setLoading(false);
    }
    fetchPrescription();
  }, [hash]);

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center bg-white/80 max-w-sm shadow-soft-float">
          <Activity className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#0F172A]">Vérification du sceau cryptographique...</p>
        </GlassCard>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center bg-white/95 max-w-md space-y-4 shadow-soft-float">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Prescription Non Trouvée</h2>
          <p className="text-xs text-slate-500">
            Le sceau cryptographique <span className="font-mono text-slate-700 font-bold">{hash}</span> n'a pas pu être validé dans le registre local.
          </p>
          <Link href="/">
            <GlassButton variant="primary" size="sm">
              Retour à l'accueil
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#3B82F6] font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </Link>

          <GlassButton variant="secondary" size="sm" onClick={handlePrint} className="text-xs">
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le Certificat</span>
          </GlassButton>
        </div>

        {/* Status Banner */}
        <GlassCard className="p-6 sm:p-7 bg-gradient-to-r from-emerald-500/10 via-white to-teal-500/10 border-2 border-emerald-400/80 shadow-soft-float space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-extrabold text-emerald-950">
                    Sceau Cryptographique SHA-256 Valide
                  </h1>
                  <Badge variant="emerald" size="sm">
                    Certifié Authentique
                  </Badge>
                </div>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Document médical inaltérable scellé par l'Ordre des Médecins du Sénégal (ONMS).
                </p>
              </div>
            </div>
          </div>

          {/* Hash details */}
          <div className="p-3 bg-white rounded-[20px] border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5 overflow-hidden">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Empreinte Numérique SHA-256 (64 caractères) :
              </span>
              <p className="font-mono text-[11px] text-slate-800 break-all font-semibold select-all">
                {prescription.hash}
              </p>
            </div>

            <GlassButton
              variant={copied ? 'success' : 'secondary'}
              size="sm"
              onClick={copyHash}
              className="flex-shrink-0 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié' : 'Copier Hash'}</span>
            </GlassButton>
          </div>
        </GlassCard>

        {/* Printable Official Medical Document */}
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-slate-200/90 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                THIAM GLOBAL BUSINESS
              </h2>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                Direction Médicale • TéléMed Sénégal
              </span>
              <div className="text-xs text-slate-700 space-y-0.5 mt-2">
                <p className="font-bold text-slate-900 text-sm">{prescription.doctorName}</p>
                <p className="text-[#3B82F6] font-semibold">{prescription.doctorSpeciality}</p>
                <p className="font-mono text-emerald-800 font-bold">N° ONMS : {prescription.doctorOnms}</p>
                <p className="text-slate-500">{prescription.doctorClinic} • {prescription.doctorCity}</p>
              </div>
            </div>

            <div className="text-right sm:text-right text-xs space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ORDONNANCE OFFICIELLE
              </div>
              <p className="text-[11px] text-slate-500">
                Scellée le : <strong>{new Date(prescription.sealedAt).toLocaleDateString('fr-FR')}</strong> à {new Date(prescription.sealedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Patient Privacy Compliant Identity Box */}
          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Patient(e) :</span>
              <strong className="text-[#0F172A] font-extrabold text-sm">{prescription.patientName}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Sexe & Âge :</span>
              <strong className="text-slate-800">{prescription.patientGender === 'F' ? 'Femme' : 'Homme'}, {prescription.patientAge} ans</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Téléphone :</span>
              <span className="font-mono text-slate-800">{prescription.patientPhone}</span>
            </div>
          </div>

          {/* Medications list */}
          <div className="space-y-4 py-2">
            <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-slate-200 pb-1 block">
              Molécules & Posologies Prescrites :
            </span>
            <ol className="space-y-3.5 list-decimal list-inside text-xs">
              {prescription.items.map((item, idx) => (
                <li key={idx} className="space-y-0.5">
                  <strong className="text-[#0F172A] font-bold text-sm">{item.medication}</strong>
                  <div className="pl-4 text-slate-600 space-y-0.5">
                    <p>Posologie : <em>{item.dosage}</em></p>
                    <p className="text-[11px] text-slate-500">Durée du traitement : <strong>{item.duration}</strong></p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Dietary advice */}
          {prescription.dietaryAdvice && (
            <div className="p-4 rounded-[20px] bg-blue-50/60 border border-blue-100 text-xs space-y-1">
              <strong className="text-[#3B82F6] font-bold block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Conseils Hygiéno-Diététiques :
              </strong>
              <p className="text-slate-700 leading-relaxed">{prescription.dietaryAdvice}</p>
            </div>
          )}

          {/* Official Stamp & QR Code */}
          <div className="pt-5 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-center p-1 text-emerald-800 transform -rotate-6 shadow-sm">
                <span className="text-[8px] font-extrabold uppercase">Ordre des Médecins</span>
                <Stethoscope className="w-3.5 h-3.5 text-emerald-600 my-0.5" />
                <span className="text-[8px] font-bold">ONMS {prescription.doctorOnms}</span>
                <span className="text-[7px] text-emerald-600 font-extrabold">CERTIFIÉ CONFORME</span>
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-900 block">{prescription.doctorName}</span>
                <span className="text-[10px] block">Signature & Cachet Numérique ONMS</span>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-[10px] text-slate-400 block">Plateforme Agréée</span>
              <strong className="text-slate-800">TéléMed Sénégal V2</strong>
              <p className="text-[10px] text-slate-400">Thiam Global Business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
