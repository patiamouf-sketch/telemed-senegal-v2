'use client';

import React, { useState } from 'react';
import { DoctorProfile, PatientQueueItem } from '@/lib/types/doctor';
import { OfficialPrescription, PrescriptionItem } from '@/lib/types/prescription';
import { searchDrugs, DrugEntry } from '@/lib/data/dciDatabase';
import { generatePrescriptionHash } from '@/lib/utils/cryptoSeal';
import { isDoctorLicenseValid } from '@/lib/utils/license';
import { submitPendingMedication } from '@/lib/services/doctorService';
import { downloadPrescriptionPDF } from '@/lib/utils/pdfGenerator';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import {
  X,
  FileText,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  Printer,
  CheckCircle2,
  Stethoscope,
  Heart,
  Eye,
  Edit3,
  Sparkles,
  AlertCircle,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { LocalQRCode } from '../ui/LocalQRCode';

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
  const [formError, setFormError] = useState<string | null>(null);

  // Lignes d'ordonnance initiales harmonisées (Médicament en MAJUSCULES, posologie & durée en minuscules)
  const [items, setItems] = useState<PrescriptionItem[]>([
    {
      id: 'rx-1',
      medication: 'PARACETAMOL (DOLIPRANE) 1G',
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

  // Recherche DCI
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      setSearchResults(searchDrugs(val));
    } else {
      setSearchResults([]);
    }
  };

  // Sélection d'un médicament du référentiel (Nom converti en MAJUSCULES, posologie & durée en minuscules)
  const handleSelectDrug = (drug: DrugEntry) => {
    const brandStr = drug.brandNames.length > 0 ? ` (${drug.brandNames[0]})` : '';
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      medication: `${drug.dci}${brandStr}`.toUpperCase(),
      ammCode: drug.ammCode,
      form: drug.defaultForm,
      dosage: (drug.defaultDosage || '').toLowerCase(),
      duration: (drug.defaultDuration || '5 jours').toLowerCase(),
    };
    setItems(prev => [...prev, newItem]);
    if (drug.defaultChd && !dietaryAdvice.includes(drug.defaultChd)) {
      setDietaryAdvice(prev => (prev ? `${prev}\n• ${drug.defaultChd}` : drug.defaultChd || ''));
    }
    setSearchQuery('');
    setSearchResults([]);
    setFormError(null);
  };

  // Ajout d'une ligne vierge ou personnalisée (Saisie libre directe avec stylo)
  const handleAddCustomDrug = (customName?: string) => {
    const nameToAdd = (customName || searchQuery).trim().toUpperCase();

    const newItem: PrescriptionItem = {
      id: `rx-custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      medication: nameToAdd || '',
      ammCode: 'EN-ATTENTE-REF',
      form: 'Comprimé',
      dosage: '',
      duration: '',
    };

    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    setFormError(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Mise à jour d'un champ avec harmonisation automatique :
  // - medication : toujours en MAJUSCULES
  // - dosage : toujours en minuscules
  // - duration : toujours en minuscules
  const handleUpdateItem = (id: string, field: keyof PrescriptionItem, val: string) => {
    let formattedVal = val;
    if (field === 'medication') {
      formattedVal = val.toUpperCase();
    } else if (field === 'dosage' || field === 'duration') {
      formattedVal = val.toLowerCase();
    }

    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: formattedVal } : item))
    );
    setFormError(null);
  };

  // Validation stricte et signature de l'ordonnance
  const handleSignAndClose = async () => {
    setFormError(null);

    // 1. Vérification de sécurité de la licence médicale
    const licenseCheck = isDoctorLicenseValid(doctor);
    if (!licenseCheck.isValid) {
      alert("Votre licence a expiré. Pour régulariser votre situation, veuillez contacter la Direction Générale au +221 78 106 92 98.");
      return;
    }

    // 2. Vérification de la présence de médicaments
    if (items.length === 0) {
      setFormError('Veuillez ajouter au moins un médicament sur l’ordonnance.');
      return;
    }

    // 3. Validation des 3 champs OBLIGATOIRES pour chaque ligne
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (!it.medication.trim()) {
        setFormError(`Ligne ${idx + 1} : Le NOM DU MÉDICAMENT est obligatoire (en MAJUSCULES).`);
        return;
      }
      if (!it.dosage.trim()) {
        setFormError(`Ligne ${idx + 1} (${it.medication}) : La POSOLOGIE est obligatoire (en minuscules).`);
        return;
      }
      if (!it.duration.trim()) {
        setFormError(`Ligne ${idx + 1} (${it.medication}) : Le NOMBRE DE JOURS DE TRAITEMENT est obligatoire (en minuscules, ex: "5 jours").`);
        return;
      }
    }

    setIsSealing(true);
    const timestamp = new Date().toISOString();

    // Soumission automatique des nouveaux médicaments non répertoriés pour examen admin
    for (const item of items) {
      if (item.ammCode === 'EN-ATTENTE-REF' || !item.ammCode) {
        submitPendingMedication({
          name: item.medication,
          dosage: item.dosage,
          form: item.form,
          duration: item.duration,
          doctorName: doctor.fullName,
          doctorId: doctor.id,
        }).catch(e => console.warn('Pending med submission notice:', e));
      }
    }

    // Calcul du condensat
    const hash = await generatePrescriptionHash({
      patientNin: patient.patientPhone || 'TEL-SN',
      doctorId: doctor.id,
      timestamp,
      items,
    });

    const origin = typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://telemed-senegal-v2.vercel.app';
    const verificationUrl = `${origin}/verify-rx/${hash}`;

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
      doctorSignatureStampUrl: doctor.signatureStampUrl,
      patientId: patient.id,
      patientName: patient.patientName,
      patientPhone: patient.patientPhone,
      patientAge: patient.age,
      patientGender: patient.gender,
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
                  Ordonnancier Médical
                </h2>
                <Badge variant="emerald" size="sm">
                  TELEMED SENEGAL
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Saisie libre maîtrisée : Médicament en MAJUSCULES • Posologie & Durée en minuscules.
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

        {/* Patient Identity Badge */}
        <div className="p-4 rounded-[24px] bg-gradient-to-r from-sky-50/80 via-white to-blue-50/70 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Patient Pris en Charge</span>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-sm font-extrabold text-[#0F172A]">{patient.patientName}</strong>
              <span className="font-mono text-xs font-bold text-blue-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                Tél : {patient.patientPhone}
              </span>
              <Badge variant="blue" size="sm">
                {patient.gender === 'F' ? 'Femme' : 'Homme'} • {patient.age} ans
              </Badge>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Médecin Prescripteur</span>
            <strong className="text-xs font-bold text-[#0F172A]">{doctor.fullName}</strong>
            <span className="text-[11px] text-emerald-700 font-mono font-semibold block">ONMS : {doctor.onmsNumber}</span>
          </div>
        </div>

        {/* Tabs: Édition vs Aperçu */}
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
              1. Rédaction de l'Ordonnance ({items.length})
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
              2. Aperçu avec Cachet Officiel
            </button>
          </div>
        )}

        {/* Erreur de validation */}
        {formError && (
          <div className="p-3.5 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{formError}</span>
          </div>
        )}

        {/* VIEW 1: EDITOR FORM */}
        {!sealedPrescription && activeTab === 'editor' && (
          <div className="space-y-5 text-xs sm:text-sm">
            {/* Barre de recherche avec autocomplétion optionnelle */}
            <div className="relative space-y-1.5">
              <label className="block text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#3B82F6]" />
                Recherche de Médicament (DCI / Nom Commercial) ou Saisie Directe :
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Tapez le nom du médicament (ex: PARACETAMOL, AMOXICILLINE, ou tout autre médicament...)"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        e.preventDefault();
                        if (searchResults.length > 0) {
                          handleSelectDrug(searchResults[0]);
                        } else {
                          handleAddCustomDrug();
                        }
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-xs text-[#0F172A] shadow-sm uppercase placeholder:normal-case"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>

                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddCustomDrug()}
                  className="rounded-[20px] text-xs font-bold whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ajouter une Ligne</span>
                </GlassButton>
              </div>

              {/* Suggestions dropdown */}
              {searchQuery.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-[24px] border border-slate-200/80 shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((drug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectDrug(drug)}
                      className="p-3 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-[#0F172A] uppercase">{drug.dci}</strong>
                          {drug.brandNames.length > 0 && (
                            <span className="text-[11px] text-[#3B82F6] font-semibold uppercase">
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

                  <div
                    onClick={() => handleAddCustomDrug()}
                    className="p-3.5 bg-amber-50/60 hover:bg-amber-100/70 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Prescrire : <span className="font-mono uppercase underline">"{searchQuery.trim().toUpperCase()}"</span>
                        </p>
                        <span className="text-[10px] text-amber-700">
                          Saisie libre personnalisée transmise sur l'ordonnance.
                        </span>
                      </div>
                    </div>
                    <Badge variant="amber" size="sm">
                      Saisie Libre
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F172A] block">
                  Lignes d'ordonnance prescrites ({items.length}) :
                </label>
                <button
                  type="button"
                  onClick={() => handleAddCustomDrug('')}
                  className="text-xs text-[#3B82F6] font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un autre médicament
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center rounded-[20px] bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs space-y-2">
                  <p>Aucun médicament sur l'ordonnance.</p>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddCustomDrug('')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une ligne
                  </GlassButton>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-[22px] bg-white border border-slate-200/80 shadow-sm space-y-3 transition-all"
                    >
                      {/* Ligne 1 : Nom du médicament (OBLIGATOIRE EN MAJUSCULES) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-extrabold text-[#0F172A] uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-blue-50 text-[#3B82F6] inline-flex items-center justify-center font-bold text-[10px]">
                              {index + 1}
                            </span>
                            Nom du Médicament * <span className="text-[9px] text-blue-600 font-semibold">(MAJUSCULES)</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="EX: AMOXICILLINE 1G COMPRIME"
                            value={item.medication}
                            onChange={e => handleUpdateItem(item.id, 'medication', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs font-bold text-[#0F172A] focus:bg-white uppercase placeholder:normal-case"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors mt-4 flex-shrink-0"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Ligne 2 : Posologie & Nombre de jours (OBLIGATOIRES EN MINUSCULES) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            Posologie * <span className="text-[9px] text-slate-400 font-normal">(en minuscules)</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ex: 1 comprimé 3 fois par jour au cours des repas"
                            value={item.dosage}
                            onChange={e => handleUpdateItem(item.id, 'dosage', e.target.value)}
                            className="w-full px-3 py-2 rounded-[14px] bg-slate-50 border border-slate-200 text-xs text-[#0F172A] focus:bg-white lowercase"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            Durée du traitement * <span className="text-[9px] text-slate-400 font-normal">(en minuscules)</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ex: 5 jours"
                            value={item.duration}
                            onChange={e => handleUpdateItem(item.id, 'duration', e.target.value)}
                            className="w-full px-3 py-2 rounded-[14px] bg-slate-50 border border-slate-200 text-xs text-[#0F172A] focus:bg-white lowercase"
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
                <span>Valider et Signer l'Ordonnance</span>
              </GlassButton>
            </div>
          </div>
        )}

        {/* VIEW 2: REAL-TIME PREVIEW BEFORE/AFTER SIGNING */}
        {(activeTab === 'preview' || sealedPrescription) && (
          <div className="space-y-6 text-xs sm:text-sm">
            <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-slate-200/90 shadow-lg space-y-6 relative overflow-hidden">
              {/* Header with TELEMED SENEGAL Logo */}
              <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-sm">
                      +
                    </div>
                    <div>
                      <h1 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                        TELEMED SENEGAL
                      </h1>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">
                        Direction Médicale • Service de Téléconsultation
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

              {/* Patient Block with Phone Number */}
              <div className="p-3.5 rounded-[18px] bg-slate-50 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">Patient(e) :</span>
                  <strong className="text-slate-900 font-bold text-sm">{patient.patientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">Téléphone :</span>
                  <strong className="text-slate-900 font-mono">{patient.patientPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold">Sexe & Âge :</span>
                  <span className="text-slate-800">{patient.gender === 'F' ? 'Femme' : 'Homme'}, {patient.age} ans</span>
                </div>
              </div>

              {/* Prescribed Items (Médicaments en MAJUSCULES, posologies & durées en minuscules) */}
              <div className="space-y-4 py-2">
                <span className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider border-b border-slate-200 pb-1 block">
                  Prescription Médicale :
                </span>
                <ol className="space-y-3 list-decimal list-inside text-xs">
                  {items.map((item, idx) => (
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

              {/* CHD */}
              {dietaryAdvice && (
                <div className="p-3.5 rounded-[18px] bg-blue-50/50 text-xs border border-blue-100/70 space-y-1">
                  <strong className="text-[#3B82F6] font-bold block text-[11px] uppercase tracking-wider">
                    Conseils Hygiéno-Diététiques (CHD) & Suivi :
                  </strong>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{dietaryAdvice}</p>
                </div>
              )}

              {/* Stamp, Signature & Discreet QR Code */}
              <div className="pt-4 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Official Stamp & Signature */}
                {doctor.signatureStampUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="h-20 max-w-[170px] p-1 bg-white rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-center">
                      <img
                        src={doctor.signatureStampUrl}
                        alt="Cachet et Signature Praticien"
                        className="max-h-16 max-w-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span className="font-bold text-slate-900 block">{doctor.fullName}</span>
                      <span className="text-[10px] text-emerald-700 font-semibold block">Cachet & Signature Authentifiés</span>
                      {doctor.onmsNumber && (
                        <span className="text-[9px] font-mono text-slate-400 block">ONMS : {doctor.onmsNumber}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-center p-1 text-emerald-800 transform -rotate-6 shadow-sm">
                      <span className="text-[8px] font-extrabold uppercase">
                        {doctor.onmsNumber ? 'Ordre des Médecins' : 'Praticien Diplômé'}
                      </span>
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600 my-0.5" />
                      <span className="text-[8px] font-bold">
                        {doctor.onmsNumber ? `ONMS ${doctor.onmsNumber}` : 'DIPLÔMÉ D’ÉTAT'}
                      </span>
                      <span className="text-[7px] text-emerald-600 font-extrabold">CERTIFIÉ CONFORME</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <span className="font-bold text-slate-900 block">{doctor.fullName}</span>
                      <span className="text-[10px] text-slate-400 block italic">
                        {doctor.onmsNumber ? 'Signature & Cachet Numérique ONMS' : 'Signature & Cachet Certifié'}
                      </span>
                    </div>
                  </div>
                )}

                {/* QR Code */}
                {sealedPrescription ? (
                  <div className="flex items-center gap-3 text-right">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Vérification Numérique</span>
                      <strong className="text-xs text-slate-800 font-bold block">TELEMED SENEGAL</strong>
                      <span className="text-[9px] text-emerald-700 font-semibold block">Scan de conformité</span>
                    </div>

                    <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
                      <LocalQRCode value={sealedPrescription.verificationUrl} size={64} />
                    </div>
                  </div>
                ) : (
                  <div className="text-right text-slate-400 text-xs italic">
                    Le QR Code de vérification apparaîtra dès la signature.
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
                    <span>Valider et Signer l'Ordonnance</span>
                  </GlassButton>
                </>
              ) : (
                <>
                  <GlassButton
                    variant="primary"
                    size="md"
                    onClick={() => sealedPrescription && downloadPrescriptionPDF(sealedPrescription)}
                    className="w-full sm:w-auto text-xs shadow-pill"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger PDF Direct</span>
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    size="md"
                    onClick={handlePrint}
                    className="w-full sm:w-auto text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer</span>
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
