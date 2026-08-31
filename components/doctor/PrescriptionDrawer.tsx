'use client';

import React, { useState } from 'react';
import { DoctorProfile, PatientQueueItem } from '@/lib/types/doctor';
import { OfficialPrescription, PrescriptionItem } from '@/lib/types/prescription';
import { searchDrugs, DrugEntry } from '@/lib/data/dciDatabase';
import { generatePrescriptionHash } from '@/lib/utils/cryptoSeal';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import {
  X,
  FileText,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  QrCode,
  Printer,
  CheckCircle2,
  Lock,
  Stethoscope,
  Heart,
  Eye,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface PrescriptionDrawerProps {
  doctor: DoctorProfile;
  patient: PatientQueueItem;
  onClose: () => void;
  onPrescriptionSealed: (prescription: OfficialPrescription) => void;
}

export function PrescriptionDrawer({
  doctor,
  patient,
  onClose,
  onPrescriptionSealed,
}: PrescriptionDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DrugEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const [items, setItems] = useState<PrescriptionItem[]>([
    {
      id: 'rx-1',
      medication: 'Paracétamol (Doliprane) 1g',
      ammCode: 'ARP-SN-2022-0145',
      form: 'Comprimé 1g',
      dosage: '1 comprimé toutes les 8h si douleurs ou fièvre (max 3g/24h)',
      duration: '5 jours',
    },
  ]);

  const [dietaryAdvice, setDietaryAdvice] = useState(
    'Hydratation abondante (au moins 2 litres d’eau par jour). Repos strict pendant 48h. Consulter en urgence en cas d’apparition de fièvre > 39°C ou de difficultés respiratoires.'
  );

  const [isSealing, setIsSealing] = useState(false);
  const [sealedPrescription, setSealedPrescription] = useState<OfficialPrescription | null>(null);

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      setSearchResults(searchDrugs(val));
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectDrug = (drug: DrugEntry) => {
    const brandStr = drug.brandNames.length > 0 ? ` (${drug.brandNames[0]})` : '';
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      medication: `${drug.dci}${brandStr}`,
      ammCode: drug.ammCode,
      form: drug.defaultForm,
      dosage: drug.defaultDosage,
      duration: drug.defaultDuration,
    };
    setItems(prev => [...prev, newItem]);
    if (drug.defaultChd && !dietaryAdvice.includes(drug.defaultChd)) {
      setDietaryAdvice(prev => (prev ? `${prev}\n• ${drug.defaultChd}` : drug.defaultChd || ''));
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PrescriptionItem, val: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Signer et Clôturer (SHA-256: [NIN_Patient + ID_Medecin + Date + Liste_Medocs])
  const handleSignAndClose = async () => {
    if (items.length === 0) {
      alert('Veuillez ajouter au moins un médicament avant de signer l’ordonnance.');
      return;
    }

    setIsSealing(true);
    const timestamp = new Date().toISOString();

    // SHA-256 strict: [NIN_Patient + ID_Medecin + Date + Liste_Medocs]
    const hash = await generatePrescriptionHash({
      patientNin: patient.patientNin || 'NIN-SN-999999',
      doctorId: doctor.id,
      timestamp,
      items,
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://telemed.sn';
    const verificationUrl = `${origin}/verify/${hash}`;

    const newPrescription: OfficialPrescription = {
      id: `presc-${Date.now()}`,
      hash,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorSpeciality: doctor.speciality,
      doctorOnms: doctor.onmsNumber,
      doctorClinic: doctor.clinicName,
      doctorPhone: doctor.phone,
      doctorCity: doctor.city,
      patientId: patient.id,
      patientName: patient.patientName,
      patientNin: patient.patientNin,
      patientAge: patient.age,
      patientGender: patient.gender,
      patientPhone: patient.patientPhone,
      items,
      dietaryAdvice,
      sealedAt: timestamp,
      verificationUrl,
      status: 'valid',
    };

    setSealedPrescription(newPrescription);
    setIsSealing(false);
    onPrescriptionSealed(newPrescription);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#60A5FA']
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md overflow-y-auto font-sans"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] p-6 sm:p-8 my-auto shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">
                  Moteur de Prescription ARP Sénégal
                </h2>
                <Badge variant="emerald" size="sm">
                  SHA-256 Certifié
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Liste DCI/AMM validée par l'Agence de Régulation Pharmaceutique & ONMS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Identity Badge with Mandatory NIN for Legal Traceability */}
        <div className="p-4 rounded-[24px] bg-gradient-to-r from-sky-50/80 via-white to-blue-50/70 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Patient Pris en Charge</span>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-sm font-extrabold text-[#0F172A]">{patient.patientName}</strong>
              <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                NIN: {patient.patientNin}
              </span>
              <Badge variant="blue" size="sm">
                {patient.gender === 'F' ? 'Femme' : 'Homme'} • {patient.age} ans
              </Badge>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Médecin Prescripteur</span>
            <strong className="text-xs font-bold text-[#0F172A]">{doctor.fullName}</strong>
            <span className="text-[11px] text-emerald-700 font-mono font-semibold block">ONMS: {doctor.onmsNumber}</span>
          </div>
        </div>

        {/* Tabs: Édition vs Aperçu Temps Réel */}
        {!sealedPrescription && (
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              1. Formulaire de Prescription
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              2. Aperçu avec Cachet & Signature ({items.length})
            </button>
          </div>
        )}

        {/* VIEW 1: EDITOR FORM */}
        {!sealedPrescription && activeTab === 'editor' && (
          <div className="space-y-5 text-xs sm:text-sm">
            {/* DCI/AMM Autocomplete Search */}
            <div className="relative">
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#3B82F6]" />
                Recherche Intelligente DCI / AMM (ARP Sénégal) :
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tapez un nom ou une DCI (ex: Paracétamol, Doliprane, Amoxicilline, Augmentin, Ventoline, Coartem...)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-xs text-[#0F172A] shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              {/* Autocomplete Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-[24px] border border-slate-200/80 shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((drug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectDrug(drug)}
                      className="p-3 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-[#0F172A]">{drug.dci}</strong>
                          {drug.brandNames.length > 0 && (
                            <span className="text-[11px] text-[#3B82F6] font-semibold">
                              ({drug.brandNames.join(', ')})
                            </span>
                          )}
                          <Badge variant="slate" size="sm" className="font-mono text-[9px]">
                            {drug.ammCode}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400">{drug.category} • {drug.defaultForm}</span>
                      </div>
                      <Plus className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#0F172A] block">
                Lignes d'ordonnance ({items.length}) :
              </label>

              {items.length === 0 ? (
                <div className="p-6 text-center rounded-[20px] bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
                  Recherchez et ajoutez des molécules ci-dessus.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-[20px] bg-white border border-slate-100 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center font-bold text-[11px]">
                            {index + 1}
                          </span>
                          <strong className="text-xs font-extrabold text-[#0F172A]">{item.medication}</strong>
                          {item.ammCode && (
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {item.ammCode}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Posologie :</label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={e => handleUpdateItem(item.id, 'dosage', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-[14px] bg-slate-50 border border-slate-200/70 text-xs focus:bg-white text-[#0F172A]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Durée :</label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={e => handleUpdateItem(item.id, 'duration', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-[14px] bg-slate-50 border border-slate-200/70 text-xs focus:bg-white text-[#0F172A]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conseils Hygiéno-Diététiques (CHD) */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Conseils Hygiéno-Diététiques (CHD) & Recommandations :
              </label>
              <textarea
                rows={3}
                value={dietaryAdvice}
                onChange={e => setDietaryAdvice(e.target.value)}
                placeholder="Précisez les mesures non-médicamenteuses (repos, régime sans sel, hydratation, signes d'alarme...)"
                className="w-full p-3.5 rounded-[20px] bg-white border border-slate-200/80 text-xs text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm leading-relaxed"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="text-xs text-[#3B82F6] font-bold hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Voir l'aperçu officiel avec cachet
              </button>

              <GlassButton
                type="button"
                variant="primary"
                size="md"
                onClick={handleSignAndClose}
                isLoading={isSealing}
                className="shadow-pill"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Signer et Clôturer (SHA-256)</span>
              </GlassButton>
            </div>
          </div>
        )}

        {/* VIEW 2: REAL-TIME PREVIEW BEFORE/AFTER SIGNING */}
        {(activeTab === 'preview' || sealedPrescription) && (
          <div className="space-y-6 text-xs sm:text-sm">
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-slate-200/90 shadow-lg space-y-6 relative overflow-hidden">
              {/* Header with Thiam Global Business Logo */}
              <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-sm">
                      +
                    </div>
                    <div>
                      <h1 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                        THIAM GLOBAL BUSINESS
                      </h1>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">
                        Direction Médicale • TéléMed Sénégal V2
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 mt-2">
                    <p className="font-bold text-slate-900">{doctor.fullName}</p>
                    <p>{doctor.speciality}</p>
                    <p className="font-mono text-emerald-800 font-bold">N° ONMS : {doctor.onmsNumber}</p>
                    <p>{doctor.clinicName || 'Cabinet Médical'} • {doctor.city || 'Dakar'}</p>
                  </div>
                </div>

                <div className="text-right sm:text-right text-xs space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ORDONNANCE MÉDICALE OFFICIELLE
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Date : <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                  </p>
                </div>
              </div>

              {/* Patient Block with NIN */}
              <div className="p-3.5 rounded-[18px] bg-slate-50 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[10px] block">Patient(e) :</span>
                  <strong className="text-slate-900 font-bold text-sm">{patient.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">NIN (Identité) :</span>
                  <strong className="text-slate-900 font-mono">{patient.patientNin}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Sexe & Âge :</span>
                  <span className="text-slate-800">{patient.gender === 'F' ? 'Femme' : 'Homme'}, {patient.age} ans</span>
                </div>
              </div>

              {/* Prescribed Items */}
              <div className="space-y-4 py-2">
                <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-slate-200 pb-1 block">
                  Prescription Médicale :
                </span>
                <ol className="space-y-3 list-decimal list-inside text-xs">
                  {items.map((item, idx) => (
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

              {/* CHD */}
              {dietaryAdvice && (
                <div className="p-3.5 rounded-[18px] bg-blue-50/50 text-xs border border-blue-100/70 space-y-1">
                  <strong className="text-[#3B82F6] font-bold block text-[11px] uppercase tracking-wider">
                    Conseils Hygiéno-Diététiques (CHD) & Suivi :
                  </strong>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{dietaryAdvice}</p>
                </div>
              )}

              {/* Stamp, Signature & SHA-256 QR Code */}
              <div className="pt-4 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Official Stamp & Signature */}
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-center p-1 text-emerald-800 transform -rotate-6 shadow-sm">
                    <span className="text-[8px] font-extrabold uppercase">Ordre des Médecins</span>
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600 my-0.5" />
                    <span className="text-[8px] font-bold">ONMS {doctor.onmsNumber}</span>
                    <span className="text-[7px] text-emerald-600 font-extrabold">CERTIFIÉ CONFORME</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-bold text-slate-900 block">{doctor.fullName}</span>
                    <span className="text-[10px] text-slate-400 block italic">Signature & Cachet Numérique ONMS</span>
                  </div>
                </div>

                {/* QR Code */}
                {sealedPrescription ? (
                  <div className="flex items-center gap-3 text-right">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Sceau Cryptographique SHA-256</span>
                      <div className="text-[9px] font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded max-w-xs break-all text-left">
                        {sealedPrescription.hash}
                      </div>
                      <span className="text-[9px] text-emerald-700 font-semibold block">Preuve d'intégrité /verify/[hash]</span>
                    </div>

                    <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(sealedPrescription.verificationUrl)}&color=0c4a6e&bgcolor=ffffff&qzone=1`}
                        alt="QR Code Vérification"
                        width={64}
                        height={64}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-right text-slate-400 text-xs italic">
                    Le QR Code et le sceau SHA-256 apparaîtront dès la signature.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              {!sealedPrescription ? (
                <>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setActiveTab('editor')}
                    className="w-full sm:w-auto text-xs"
                  >
                    Retour à l'Éditeur
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleSignAndClose}
                    isLoading={isSealing}
                    className="w-full sm:w-auto text-xs shadow-pill"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Signer et Clôturer (SHA-256)</span>
                  </GlassButton>
                </>
              ) : (
                <>
                  <GlassButton
                    variant="secondary"
                    size="md"
                    onClick={handlePrint}
                    className="w-full sm:w-auto text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer le PDF Officiel</span>
                  </GlassButton>

                  <GlassButton
                    variant="success"
                    size="md"
                    onClick={onClose}
                    className="w-full sm:w-auto text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Transmettre & Fermer</span>
                  </GlassButton>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
