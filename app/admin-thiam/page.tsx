'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { Navbar } from '@/components/ui/Navbar';
import {
  ShieldCheck,
  UserCheck,
  XCircle,
  Clock,
  CheckCircle2,
  Users,
  Stethoscope,
  CreditCard,
  Phone,
  MapPin,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Pill,
  Plus,
  Check,
  X
} from 'lucide-react';
import { getAllDoctors, approveDoctor, rejectDoctor, renewDoctorLicense, getAdminStats } from '@/lib/services/adminService';
import { getPendingMedications, approvePendingMedication, rejectPendingMedication } from '@/lib/services/doctorService';
import { DoctorProfile, AdminStats } from '@/lib/types/doctor';
import { PendingMedication } from '@/lib/types/prescription';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function AdminThiamPage() {
  const { user, doctorProfile, isAdmin } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingMeds, setPendingMeds] = useState<PendingMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'medications' | 'all'>('pending');

  // Modal d'approbation d'un médicament
  const [selectedMedToApprove, setSelectedMedToApprove] = useState<PendingMedication | null>(null);
  const [approveDci, setApproveDci] = useState('');
  const [approveBrand, setApproveBrand] = useState('');
  const [approveCategory, setApproveCategory] = useState('Médicament Général');
  const [approveAmm, setApproveAmm] = useState('');
  const [approveForm, setApproveForm] = useState('Comprimé');
  const [approveDosage, setApproveDosage] = useState('');
  const [approveDuration, setApproveDuration] = useState('5 à 7 jours');
  const [approveChd, setApproveChd] = useState('Prise au cours des repas avec un grand verre d’eau.');

  const loadData = async () => {
    setLoading(true);
    const docs = await getAllDoctors();
    const st = await getAdminStats();
    const meds = await getPendingMedications();
    setDoctors(docs);
    setStats(st);
    setPendingMeds(meds);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveDoctor = async (docId: string, docName: string) => {
    setActionLoading(docId);
    await approveDoctor(docId);
    await loadData();
    setActionLoading(null);

    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
  };

  const handleRejectDoctor = async (docId: string) => {
    const reason = prompt('Motif du rejet :', 'Numéro ONMS non vérifiable ou dossier incomplet');
    if (!reason) return;
    setActionLoading(docId);
    await rejectDoctor(docId, reason);
    await loadData();
    setActionLoading(null);
  };

  const handleRenewLicense = async (docId: string) => {
    setActionLoading(docId);
    await renewDoctorLicense(docId, 90);
    await loadData();
    setActionLoading(null);
  };

  // Ouvrir la modal d'approbation d'un médicament
  const handleOpenMedApproveModal = (med: PendingMedication) => {
    setSelectedMedToApprove(med);
    setApproveDci(med.name);
    setApproveBrand(med.name);
    setApproveAmm(`ARP-SN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setApproveForm(med.form || 'Comprimé');
    setApproveDosage(med.dosage || '1 comprimé 2 à 3 fois par jour');
    setApproveDuration(med.duration || '5 à 7 jours');
  };

  // Valider et intégrer le médicament à la base officielle
  const handleConfirmMedApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedToApprove) return;

    setActionLoading(selectedMedToApprove.id);
    await approvePendingMedication(selectedMedToApprove.id, {
      dci: approveDci.trim(),
      brandNames: approveBrand.split(',').map(b => b.trim()).filter(Boolean),
      category: approveCategory.trim(),
      ammCode: approveAmm.trim(),
      defaultForm: approveForm.trim(),
      defaultDosage: approveDosage.trim(),
      defaultDuration: approveDuration.trim(),
      defaultChd: approveChd.trim(),
    });

    setSelectedMedToApprove(null);
    await loadData();
    setActionLoading(null);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleRejectMed = async (medId: string) => {
    if (!confirm('Voulez-vous rejeter cette proposition de médicament ?')) return;
    setActionLoading(medId);
    await rejectPendingMedication(medId);
    await loadData();
    setActionLoading(null);
  };

  const pendingDocs = doctors.filter(d => d.status === 'pending');
  const activeDocs = doctors.filter(d => d.status === 'active' && d.id !== 'admin-thiam-1');
  const activePendingMeds = pendingMeds.filter(m => m.status === 'pending');

  return (
    <div className="min-h-screen pb-16 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#3B82F6] mb-2 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l'accueil
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                  Administration Direction Médicale
                  <Badge variant="blue" size="sm">
                    TELEMED SENEGAL
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500">
                  Validation des praticiens ONMS et examen des nouveaux médicaments proposés.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={loadData}
              isLoading={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </GlassButton>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Attente ONMS</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-amber-600">
              {stats?.pendingCount ?? pendingDocs.length}
            </div>
            <span className="text-[11px] text-amber-700/80 font-medium">À valider sous 24h</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Médecins Actifs</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">
              {stats?.activeCount ?? activeDocs.length}
            </div>
            <span className="text-[11px] text-emerald-700/80 font-medium">Licences conformes</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nouveaux Médicaments</span>
              <Pill className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-3xl font-extrabold text-[#3B82F6]">
              {activePendingMeds.length}
            </div>
            <span className="text-[11px] text-blue-700/80 font-medium">À examiner / valider</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultations / Jour</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-extrabold text-indigo-600">
              {stats?.activePatientsToday ?? 12}
            </div>
            <span className="text-[11px] text-indigo-700/80 font-medium">Activité nationale</span>
          </GlassCard>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Médecins en Attente ({pendingDocs.length})
          </button>

          <button
            onClick={() => setActiveTab('medications')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'medications'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            Médicaments Proposés ({activePendingMeds.length})
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Médecins Actifs & Licences ({activeDocs.length})
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-[#0F172A] text-white'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            Tous les Praticiens ({doctors.length})
          </button>
        </div>

        {/* TAB 1: PENDING DOCTORS */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingDocs.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#0F172A]">Toutes les demandes de médecins sont traitées !</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Aucun médecin n'est actuellement en attente de validation.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pendingDocs.map(doc => (
                  <GlassCard key={doc.id} className="p-6 sm:p-7 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="amber" size="sm" className="mb-1.5">
                          En attente de validation
                        </Badge>
                        <h3 className="text-lg font-bold text-[#0F172A]">{doc.fullName}</h3>
                        <p className="text-xs text-[#3B82F6] font-bold">{doc.speciality}</p>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-4 rounded-[24px] bg-white border border-slate-100 text-xs space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" /> N° ONMS :
                        </span>
                        <strong className="font-mono text-[#0F172A] font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          {doc.onmsNumber}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Téléphone :
                        </span>
                        <strong className="font-mono text-[#0F172A] font-bold">
                          {doc.phone}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" /> Lieu d'exercice :
                        </span>
                        <span className="text-slate-700 font-medium">
                          {doc.clinicName || 'Cabinet'} ({doc.city || 'Sénégal'})
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleRejectDoctor(doc.id)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter
                      </GlassButton>

                      <GlassButton
                        variant="success"
                        size="sm"
                        onClick={() => handleApproveDoctor(doc.id, doc.fullName)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs shadow-pill-emerald"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approuver (+Licence 90j)
                      </GlassButton>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROPOSED MEDICATIONS WAITING FOR ADMIN APPROVAL */}
        {activeTab === 'medications' && (
          <div className="space-y-4">
            {activePendingMeds.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#0F172A]">Aucun médicament en attente d'approbation !</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Toutes les molécules proposées par les praticiens ont été examinées.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activePendingMeds.map(med => (
                  <GlassCard key={med.id} className="p-6 sm:p-7 space-y-4 border-l-4 border-l-[#3B82F6]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="blue" size="sm" className="mb-1.5">
                          Proposition Praticien
                        </Badge>
                        <h3 className="text-lg font-extrabold text-[#0F172A]">{med.name}</h3>
                        <p className="text-xs text-slate-500">
                          Prescrit par <strong className="text-slate-900">{med.doctorName}</strong>
                        </p>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Posologie proposée :</span>
                        <strong className="text-[#0F172A]">{med.dosage || 'Non spécifié'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Forme :</span>
                        <strong className="text-[#0F172A]">{med.form || 'Comprimé'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Durée indicative :</span>
                        <span className="text-slate-700">{med.duration || '5 jours'}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleRejectMed(med.id)}
                        isLoading={actionLoading === med.id}
                        className="text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rejeter
                      </GlassButton>

                      <GlassButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenMedApproveModal(med)}
                        className="text-xs shadow-pill"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Approuver & Ajouter à la Base DCI
                      </GlassButton>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE DOCTORS */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDocs.map(doc => {
                const daysRemaining = doc.licenseExpiresAt
                  ? differenceInDays(new Date(doc.licenseExpiresAt), new Date())
                  : 0;
                const isExpiringSoon = daysRemaining <= 15;
                const isExpired = daysRemaining < 0;

                return (
                  <GlassCard key={doc.id} className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge
                          variant={isExpired ? 'rose' : isExpiringSoon ? 'amber' : 'emerald'}
                          size="sm"
                        >
                          {isExpired ? 'Licence Expirée' : isExpiringSoon ? `Expire dans ${daysRemaining}j` : 'Licence Active'}
                        </Badge>
                        <h4 className="font-bold text-[#0F172A] text-base mt-1.5">{doc.fullName}</h4>
                        <p className="text-xs text-[#3B82F6] font-semibold">{doc.speciality}</p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-[16px] border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ONMS :</span>
                        <strong className="font-mono text-slate-800">{doc.onmsNumber}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Téléphone :</span>
                        <strong className="font-mono text-slate-800">{doc.phone}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expiration :</span>
                        <strong className={isExpired ? 'text-rose-600' : 'text-slate-800'}>
                          {doc.licenseExpiresAt ? format(new Date(doc.licenseExpiresAt), 'dd/MM/yyyy') : 'Non définie'}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      <Link href={`/dr/${doc.slug}`} target="_blank" className="text-xs text-[#3B82F6] font-bold hover:underline">
                        Voir la salle
                      </Link>

                      <GlassButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRenewLicense(doc.id)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs"
                      >
                        Prolonger (+90j)
                      </GlassButton>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: ALL DOCTORS */}
        {activeTab === 'all' && (
          <GlassCard className="p-6">
            <div className="divide-y divide-slate-100">
              {doctors.map(doc => (
                <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <strong className="text-sm font-bold text-[#0F172A] block">{doc.fullName}</strong>
                    <span className="text-slate-500">{doc.speciality} • ONMS : {doc.onmsNumber} • Tél : {doc.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === 'active' ? 'emerald' : doc.status === 'pending' ? 'amber' : 'rose'} size="sm">
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </main>

      {/* MODAL APPROBATION MEDICAMENT */}
      {selectedMedToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#3B82F6] flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Validation du Médicament</h3>
                  <span className="text-[11px] text-slate-500">Ajout officiel au catalogue DCI / ARP</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedMedToApprove(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmMedApproval} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom DCI Officiel *</label>
                <input
                  type="text"
                  required
                  value={approveDci}
                  onChange={e => setApproveDci(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Noms Commerciaux (séparés par virgule)</label>
                  <input
                    type="text"
                    value={approveBrand}
                    onChange={e => setApproveBrand(e.target.value)}
                    placeholder="Ex: Doliprane, Dafalgan"
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code AMM / ARP Sénégal</label>
                  <input
                    type="text"
                    value={approveAmm}
                    onChange={e => setApproveAmm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie Thérapeutique</label>
                  <input
                    type="text"
                    value={approveCategory}
                    onChange={e => setApproveCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forme Galénique</label>
                  <input
                    type="text"
                    value={approveForm}
                    onChange={e => setApproveForm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Posologie Recommandée</label>
                <input
                  type="text"
                  value={approveDosage}
                  onChange={e => setApproveDosage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Conseils Hygiéno-Diététiques Associés</label>
                <textarea
                  rows={2}
                  value={approveChd}
                  onChange={e => setApproveChd(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[16px] bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedMedToApprove(null)}
                >
                  Annuler
                </GlassButton>

                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading === selectedMedToApprove.id}
                  className="shadow-pill"
                >
                  <Check className="w-4 h-4" />
                  Valider et Enregistrer
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
