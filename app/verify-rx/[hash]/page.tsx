'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OfficialPrescription } from '@/lib/types/prescription';
import { getPrescriptionByHash } from '@/lib/services/doctorService';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { LocalQRCode } from '@/components/ui/LocalQRCode';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Printer,
  Stethoscope,
  Clock,
  ArrowLeft,
  Heart,
  Loader2,
  MapPin,
  Phone
} from 'lucide-react';
import Link from 'next/link';

export default function VerifyPrescriptionAliasPage() {
  const params = useParams();
  const rawHash = (params?.hash as string) || '';
  const hash = decodeURIComponent(rawHash);

  const [prescription, setPrescription] = useState<OfficialPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!hash) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const presc = await getPrescriptionByHash(hash);
      if (presc) {
        setPrescription(presc);
        setVerified(true);
      } else {
        setVerified(false);
      }
      setLoading(false);
    }
    verify();
  }, [hash]);

  const handlePrint = () => {
    window.print();
  };

  const isOnmsRegistered = Boolean(
    prescription?.doctorOnms &&
    prescription.doctorOnms.trim() !== '' &&
    !prescription.doctorOnms.toLowerCase().includes('attente') &&
    !prescription.doctorOnms.toLowerCase().includes('non') &&
    prescription.doctorOnms.toLowerCase() !== 'n/a'
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 text-center space-y-4 max-w-sm w-full">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-[#0F172A]">Vérification de l'ordonnance en cours...</h3>
          <p className="text-xs text-slate-500">Consultation du registre sécurisé TELEMED SENEGAL</p>
        </GlassCard>
      </div>
    );
  }

  if (!verified || !prescription) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans">
        <GlassCard className="p-8 text-center space-y-4 max-w-md w-full border-rose-200">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Ordonnance Non Trouvée</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ce document n'a pas pu être certifié ou la consultation vient d'être initiée. Vérifiez le lien ou le QR Code scanné.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-left text-[11px] font-mono text-slate-500 break-all">
            Empreinte recherchée : {hash || 'N/A'}
          </div>
          <Link href="/">
            <GlassButton variant="primary" size="sm" className="w-full text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l'accueil
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#3B82F6] font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </Link>

          <GlassButton variant="secondary" size="sm" onClick={handlePrint} className="text-xs">
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer l'Ordonnance</span>
          </GlassButton>
        </div>

        {/* Printable Official Medical Document */}
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-slate-200/90 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                    TELEMED SENEGAL
                  </h1>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                    Direction Médicale • Service de Téléconsultation
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-700 space-y-0.5 mt-3">
                <p className="font-bold text-slate-900 text-sm">{prescription.doctorName}</p>
                <p className="text-[#3B82F6] font-semibold">{prescription.doctorSpeciality}</p>
                {isOnmsRegistered ? (
                  <p className="font-mono text-emerald-800 font-bold">N° ONMS : {prescription.doctorOnms}</p>
                ) : (
                  <p className="text-slate-500 italic">Praticien diplômé d'État</p>
                )}
                <p className="text-slate-500">{prescription.doctorClinic || 'Cabinet Médical'} • {prescription.doctorCity || 'Sénégal'}</p>
              </div>
            </div>

            <div className="text-right sm:text-right text-xs space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ORDONNANCE OFFICIELLE
              </div>
              <p className="text-[11px] text-slate-500">
                Délivrée le : <strong>{new Date(prescription.sealedAt).toLocaleDateString('fr-FR')}</strong> à {new Date(prescription.sealedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Patient / Beneficiary Identity Box */}
          <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Patient(e) Bénéficiaire :</span>
              <strong className="text-[#0F172A] font-extrabold text-sm">{prescription.patientName}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Sexe & Âge :</span>
              <strong className="text-slate-800">{prescription.patientGender === 'F' ? 'Femme' : 'Homme'}, {prescription.patientAge} ans</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Adresse / Résidence :</span>
              <span className="text-slate-700">{prescription.beneficiaryAddress || prescription.patientAddress || 'Sénégal'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Contact / Tél :</span>
              <span className="font-mono text-slate-900 font-bold">{prescription.patientPhone}</span>
              {(prescription.beneficiaryWeight || prescription.patientWeight) && (
                <span className="text-[10px] text-[#3B82F6] font-bold block">Poids : {prescription.beneficiaryWeight || prescription.patientWeight}</span>
              )}
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
                  <strong className="text-[#0F172A] font-extrabold text-sm uppercase">{item.medication}</strong>
                  <div className="pl-4 text-slate-600 space-y-0.5">
                    <p>Posologie : <em className="lowercase">{item.dosage}</em></p>
                    <p className="text-[11px] text-slate-500">Durée du traitement : <strong className="lowercase">{item.duration}</strong></p>
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
                Conseils Hygiéno-Diététiques (CHD) :
              </strong>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{prescription.dietaryAdvice}</p>
            </div>
          )}

          {/* Official Stamp & QR Code */}
          <div className="pt-5 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {prescription.doctorSignatureStampUrl ? (
                <div className="flex items-center gap-3">
                  <div className="h-20 max-w-[170px] p-1 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-center">
                    <img
                      src={prescription.doctorSignatureStampUrl}
                      alt="Cachet & Signature Praticien"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-900 block">{prescription.doctorName}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">Cachet & Signature Authentifiés</span>
                    {prescription.doctorOnms && (
                      <span className="text-[9px] font-mono text-slate-400 block">ONMS : {prescription.doctorOnms}</span>
                    )}
                  </div>
                </div>
              ) : isOnmsRegistered ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-center p-1 text-emerald-800 transform -rotate-6 shadow-sm">
                    <span className="text-[8px] font-extrabold uppercase">Ordre des Médecins</span>
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600 my-0.5" />
                    <span className="text-[8px] font-bold">ONMS {prescription.doctorOnms}</span>
                    <span className="text-[7px] text-emerald-600 font-extrabold">CERTIFIÉ CONFORME</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-900 block">{prescription.doctorName}</span>
                    <span className="text-[10px] block italic">Signature & Cachet Numérique ONMS</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-600 flex flex-col items-center justify-center text-center p-1 text-blue-900 transform -rotate-6 shadow-sm">
                    <span className="text-[8px] font-extrabold uppercase">TELEMED SENEGAL</span>
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600 my-0.5" />
                    <span className="text-[7px] font-bold uppercase">SERVICE MÉDICAL</span>
                    <span className="text-[7px] text-blue-600 font-extrabold">AUTHENTIFIÉ</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-900 block">{prescription.doctorName}</span>
                    <span className="text-[10px] block italic">Praticien Diplômé d'État • Cachet Officiel</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Vérification Numérique</span>
                <strong className="text-xs text-slate-800 font-bold block">TELEMED SENEGAL</strong>
                <span className="text-[9px] text-emerald-700 font-semibold block">Scan de conformité</span>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                <LocalQRCode value={prescription.verificationUrl || `https://telemed-senegal-v2.vercel.app/verify-rx/${prescription.hash}`} size={64} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
