'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  X,
  ScrollText,
  FileText,
  Search,
  Filter,
  UserPlus
} from 'lucide-react';
import {
  getAllDoctors,
  approveDoctor,
  rejectDoctor,
  banDoctor,
  unbanDoctor,
  deleteDoctorPermanently,
  renewDoctorLicense,
  getAdminStats,
  getAdminAuditLogs,
  logAdminAction,
  purgeAllTestData,
} from '@/lib/services/adminService';
import { AdminCreateDoctorModal } from '@/components/admin/AdminCreateDoctorModal';
import { executeDataRetentionCycle } from '@/lib/services/retentionService';
import { getPendingMedications, approvePendingMedication, rejectPendingMedication } from '@/lib/services/doctorService';
import { DoctorProfile, AdminStats, AdminAuditLog } from '@/lib/types/doctor';
import { PendingMedication } from '@/lib/types/prescription';
import { format, differenceInDays } from 'date-fns';
import { ShieldAlert, Trash2, Ban, Unlock } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function AdminThiamPage() {
  const { user, doctorProfile, isAdmin, loading: authLoading } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingMeds, setPendingMeds] = useState<PendingMedication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<'all' | 'doctors' | 'medications' | 'licenses'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'banned' | 'medications' | 'audit' | 'all'>('pending');
  const [authSafetyPassed, setAuthSafetyPassed] = useState(false);
  const [showCreateDoctorModal, setShowCreateDoctorModal] = useState(false);

  // Modal d'approbation d'un médicament
  const [selectedMedToApprove, setSelectedMedToApprove] = useState<PendingMedication | null>(null);
  const [inspectingDoc, setInspectingDoc] = useState<DoctorProfile | null>(null);
  const [approveDci, setApproveDci] = useState('');
  const [approveBrand, setApproveBrand] = useState('');
  const [approveCategory, setApproveCategory] = useState('Médicament Général');
  const [approveAmm, setApproveAmm] = useState('');
  const [approveForm, setApproveForm] = useState('Comprimé');
  const [approveDosage, setApproveDosage] = useState('');
  const [approveDuration, setApproveDuration] = useState('5 à 7 jours');
  const [approveChd, setApproveChd] = useState('Prise au cours des repas avec un grand verre d’eau.');
  const [isPurging, setIsPurging] = useState(false);

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthSafetyPassed(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const loadData = async (silent: boolean = false) => {
    if (!isAdmin) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (!silent) setLoading(true);
      const docs = await getAllDoctors();
      const [st, meds, logs] = await Promise.all([
        getAdminStats(docs),
        getPendingMedications(),
        getAdminAuditLogs()
      ]);
      setDoctors(docs);
      setStats(st);
      setPendingMeds(meds);
      setAuditLogs(logs);
    } catch (err) {
      console.warn('Erreur lors du rafraîchissement des données admin:', err);
    } finally {
      if (!silent) setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
    // Rafraîchissement automatique en arrière-plan toutes les 12 secondes
    const interval = setInterval(() => {
      loadData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (authLoading && !authSafetyPassed && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F9FD]">
        <GlassCard className="p-8 text-center bg-white/80 max-w-xs shadow-xl">
          <RefreshCw className="w-10 h-10 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Contrôle d'accréditation...</p>
        </GlassCard>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col justify-between pt-2 bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 flex items-center justify-center">
          <GlassCard className="p-8 text-center bg-white shadow-2xl space-y-5 border-rose-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <Badge variant="rose" size="md">
              Zone Sécurisée Restreinte
            </Badge>
            <h1 className="text-xl font-extrabold text-slate-900">Accès Réservé à la Direction</h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cet espace est strictement réservé au Super-Administrateur médical de <strong>TELEMED SENEGAL</strong>.
            </p>
            <p className="text-xs text-slate-400">
              Veuillez vous connecter avec l'adresse accréditée pour accéder aux dossiers d'homologation.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link href="/">
                <GlassButton variant="primary" size="md">
                  <ArrowLeft className="w-4 h-4" />
                  Retour à l'accueil
                </GlassButton>
              </Link>
            </div>
          </GlassCard>
        </main>
      </div>
    );
  }

  const handleApproveDoctor = async (docId: string, docName: string) => {
    setActionLoading(docId);
    
    // Mise à jour optimiste immédiate dans l'interface (+30j)
    setDoctors(prev =>
      prev.map(d =>
        d.id === docId || (docName && d.fullName === docName)
          ? { ...d, status: 'active', licenseExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString() }
          : d
      )
    );

    try {
      await approveDoctor(docId, user?.email || 'dr.thiam@telemed.sn');
      await loadData(true);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B']
      });
    } catch (err) {
      console.error('Erreur lors de l\'approbation du médecin:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDoctor = async (docId: string) => {
    const reason = prompt('Motif du rejet :', 'Numéro ONMS non vérifiable ou dossier incomplet');
    if (!reason) return;
    setActionLoading(docId);

    setDoctors(prev =>
      prev.map(d =>
        d.id === docId
          ? { ...d, status: 'rejected', rejectionReason: reason }
          : d
      )
    );

    try {
      await rejectDoctor(docId, reason, user?.email || 'dr.thiam@telemed.sn');
      await loadData(true);
    } catch (err) {
      console.error('Erreur lors du rejet du médecin:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanDoctor = async (docId: string) => {
    const reason = prompt('Motif du blocage / bannissement :', 'Non-respect de la déontologie médicale ou suspension ordinale');
    if (!reason) return;
    setActionLoading(docId);

    setDoctors(prev =>
      prev.map(d =>
        d.id === docId
          ? { ...d, status: 'banned', banReason: reason }
          : d
      )
    );

    try {
      await banDoctor(docId, reason, user?.email || 'dr.thiam@telemed.sn');
      await loadData(true);
    } catch (err) {
      console.error('Erreur lors du blocage du médecin:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanDoctor = async (docId: string) => {
    if (!confirm('Voulez-vous lever la suspension de ce médecin et réactiver son accès ?')) return;
    setActionLoading(docId);

    setDoctors(prev =>
      prev.map(d =>
        d.id === docId
          ? { ...d, status: 'active', banReason: undefined }
          : d
      )
    );

    try {
      await unbanDoctor(docId, user?.email || 'dr.thiam@telemed.sn');
      await loadData(true);
    } catch (err) {
      console.error('Erreur lors de la levée de suspension:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDoctor = async (docId: string, docName: string) => {
    if (!confirm(`⚠️ ATTENTION : Êtes-vous certain de vouloir supprimer DÉFINITIVEMENT le compte du ${docName} ? Cette action est irréversible.`)) {
      return;
    }
    setActionLoading(docId);
    setDoctors(prev => prev.filter(d => d.id !== docId));
    try {
      await deleteDoctorPermanently(docId, user?.email || 'dr.thiam@telemed.sn');
      await loadData(true);
    } catch (err) {
      console.error('Erreur lors de la suppression définitive:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenewLicense = async (docId: string) => {
    setActionLoading(docId);

    setDoctors(prev =>
      prev.map(d =>
        d.id === docId
          ? { ...d, status: 'active', licenseExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString() }
          : d
      )
    );

    try {
      await renewDoctorLicense(docId, 30, user?.email || 'dr.thiam@telemed.sn');
      await loadData(true);
    } catch (err) {
      console.error('Erreur lors du renouvellement de la licence:', err);
    } finally {
      setActionLoading(null);
    }
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
    try {
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

      // Traçabilité médico-légale
      await logAdminAction({
        action: 'approve_medication',
        adminEmail: user?.email || 'dr.thiam@telemed.sn',
        targetId: selectedMedToApprove.id,
        targetName: approveDci.trim(),
        targetType: 'medication',
        details: `Molécule DCI '${approveDci.trim()}' homologuée avec le code AMM ${approveAmm.trim()} (${approveCategory.trim()}).`,
      });

      setSelectedMedToApprove(null);
      await loadData();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Erreur lors de l\'approbation du médicament:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectMed = async (medId: string) => {
    if (!confirm('Voulez-vous rejeter cette proposition de médicament ?')) return;
    const targetMed = pendingMeds.find(m => m.id === medId);
    setActionLoading(medId);
    try {
      await rejectPendingMedication(medId);

      // Traçabilité médico-légale
      await logAdminAction({
        action: 'reject_medication',
        adminEmail: user?.email || 'dr.thiam@telemed.sn',
        targetId: medId,
        targetName: targetMed?.name || 'Médicament proposé',
        targetType: 'medication',
        details: `Proposition de molécule DCI '${targetMed?.name || medId}' rejetée par la direction médicale.`,
      });

      await loadData();
    } catch (err) {
      console.error('Erreur lors du rejet du médicament:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const [isRetaining, setIsRetaining] = useState(false);

  const handlePurgeAllTestData = async () => {
    const confirmation = prompt(
      '⚠️ ACTION IRRÉVERSIBLE : Pour confirmer la PURGE COMPLÈTE de toutes les données de test (médecins fictifs, files d\'attente, ordonnances d\'essai), tapez "PURGE" ci-dessous :'
    );
    if (confirmation !== 'PURGE') {
      if (confirmation !== null) alert('Action annulée : mot de confirmation non concordant.');
      return;
    }

    setIsPurging(true);
    try {
      const res = await purgeAllTestData(user?.email || 'dr.thiam@telemed.sn');
      await loadData(false);
      alert(
        `✅ Purge réussie !\n\n` +
        `- ${res.deletedDoctors} praticiens de test supprimés\n` +
        `- ${res.deletedQueues} files d'attente supprimées\n` +
        `- ${res.deletedPrescriptions} ordonnances d'essai supprimées\n` +
        `- ${res.deletedMeds} molécules de test supprimées\n\n` +
        `Le compte officiel du Dr. Elhadji Pathé THIAM a été rigoureusement préservé.`
      );
    } catch (err) {
      console.error('Erreur lors de la purge:', err);
      alert('Une erreur est survenue lors de la purge.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleExecuteRetentionCycle = async () => {
    if (!confirm('Démarrer le cycle de rétention des données conforme CDP ?\n\n- Purge des messages de téléconsultation dont le délai de suivi est échu (> 24h)\n- Nettoyage des sessions WebRTC orphelines (> 2h)\n- 100% des ordonnances scellées (10 ans) seront scrupuleusement préservées.')) {
      return;
    }

    setIsRetaining(true);
    try {
      const res = await executeDataRetentionCycle(user?.email || 'dr.thiam@telemed.sn');
      await loadData(false);
      alert(
        `✅ Cycle de Rétention CDP terminé !\n\n` +
        `- ${res.purgedMessagesCount} messages éphémères purgés (${res.purgedQueuesCount} dossiers clôturés)\n` +
        `- ${res.purgedRtcCount} sessions WebRTC orphelines nettoyées\n\n` +
        `🛡️ 100% des ordonnances médicales scellées (10 ans) ont été préservées.`
      );
    } catch (err) {
      console.error('Erreur lors de la rétention:', err);
      alert('Une erreur est survenue lors du cycle de rétention.');
    } finally {
      setIsRetaining(false);
    }
  };

  const pendingDocs = doctors.filter(d => d.status === 'pending');
  const activeDocs = doctors.filter(d => d.status === 'active' && d.id !== 'admin-thiam-1');
  const bannedDocs = doctors.filter(d => d.status === 'banned' || d.status === 'blocked');
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
                  Direction Médicale • Contrôle & Validation
                  <Badge variant="blue" size="sm">
                    TELEMED SENEGAL
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500">
                  Dr. Elhadji Pathé THIAM, Directeur Général de THIAM GLOBAL BUSINESS, Pharmacien et Informaticien • <strong>+221 78 106 92 98</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateDoctorModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer hover:scale-105 active:scale-95"
              title="Créer directement un profil praticien et lui attribuer une licence"
            >
              <UserPlus className="w-3.5 h-3.5 text-white" />
              <span>+ Créer un Praticien</span>
            </button>
            <button
              type="button"
              onClick={handleExecuteRetentionCycle}
              disabled={isRetaining}
              className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Purger les messages temporaires des consultations échues selon la réglementation CDP"
            >
              <Clock className={`w-3.5 h-3.5 text-emerald-600 ${isRetaining ? 'animate-spin' : ''}`} />
              {isRetaining ? 'Nettoyage CDP...' : 'Rétention Données (CDP)'}
            </button>
            <button
              type="button"
              onClick={handlePurgeAllTestData}
              disabled={isPurging}
              className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Purger toutes les données fictives et réinitialiser à l'état propre"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              {isPurging ? 'Purge en cours...' : 'Purger données de test'}
            </button>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => loadData()}
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
            <span className="text-[11px] text-emerald-700/80 font-medium">Licences 30j conformes</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bloqués / Suspendus</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-extrabold text-rose-600">
              {bannedDocs.length}
            </div>
            <span className="text-[11px] text-rose-700/80 font-medium">Accès révoqués</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nouveaux Médicaments</span>
              <Pill className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-3xl font-extrabold text-[#3B82F6]">
              {activePendingMeds.length}
            </div>
            <span className="text-[11px] text-blue-700/80 font-medium">Proposés en consultation</span>
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
            onClick={() => setActiveTab('banned')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'banned'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Suspendus ({bannedDocs.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            Journal d'Audit & Traçabilité ({auditLogs.length})
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
                          <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" /> Situation Ordinale :
                        </span>
                        {doc.onmsNumber ? (
                          <strong className="font-mono text-[#0F172A] font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            ONMS : {doc.onmsNumber}
                          </strong>
                        ) : (
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                            Jeune Diplômé d'État (CNI)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> NIN :
                        </span>
                        <strong className="font-mono text-[#0F172A] font-bold">
                          {doc.nin || 'Non renseigné'}
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

                      {doc.verificationDocumentUrl && (
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setInspectingDoc(doc)}
                            className="w-full py-2 px-3 rounded-[14px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>
                              Inspecter le justificatif ({doc.verificationDocumentType === 'id_card' ? 'Carte d’Identité CNI' : 'Carte ONMS'})
                            </span>
                          </button>
                        </div>
                      )}
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
                        Approuver (+Licence 30j)
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
                const isExpiringSoon = daysRemaining <= 7;
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
                        <strong className="font-mono text-slate-800">{doc.onmsNumber || 'N/A'}</strong>
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
                        Voir salle
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRenewLicense(doc.id)}
                          isLoading={actionLoading === doc.id}
                          className="text-xs"
                          title="Prolonger la licence de 30 jours"
                        >
                          +30j
                        </GlassButton>

                        <GlassButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleBanDoctor(doc.id)}
                          isLoading={actionLoading === doc.id}
                          className="text-xs px-2"
                          title="Bloquer l'accès"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </GlassButton>

                        <GlassButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteDoctor(doc.id, doc.fullName)}
                          isLoading={actionLoading === doc.id}
                          className="text-xs px-2 text-rose-600 hover:bg-rose-50"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </GlassButton>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: BANNED / BLOCKED DOCTORS */}
        {activeTab === 'banned' && (
          <div className="space-y-4">
            {bannedDocs.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#0F172A]">Aucun praticien suspendu</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tous les praticiens enregistrés sont en règle ou en attente.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bannedDocs.map(doc => (
                  <GlassCard key={doc.id} className="p-5 space-y-3 border-rose-200 bg-rose-50/40">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="rose" size="sm">
                          Compte Suspendu / Bloqué
                        </Badge>
                        <h4 className="font-bold text-slate-900 text-base mt-1">{doc.fullName}</h4>
                        <p className="text-xs text-slate-500">{doc.speciality} • Tél: {doc.phone}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Ban className="w-4 h-4" />
                      </div>
                    </div>

                    {doc.banReason && (
                      <div className="p-3 bg-white rounded-xl border border-rose-100 text-xs text-rose-900">
                        <strong>Motif de suspension :</strong> {doc.banReason}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <GlassButton
                        size="sm"
                        variant="success"
                        onClick={() => handleUnbanDoctor(doc.id)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Lever la suspension
                      </GlassButton>

                      <GlassButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDeleteDoctor(doc.id, doc.fullName)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </GlassButton>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ALL DOCTORS */}
        {activeTab === 'all' && (
          <GlassCard className="p-6">
            <div className="divide-y divide-slate-100">
              {doctors.map(doc => (
                <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <strong className="text-sm font-bold text-[#0F172A] block">{doc.fullName}</strong>
                    <span className="text-slate-500">{doc.speciality} • ONMS : {doc.onmsNumber || 'N/A'} • Tél : {doc.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === 'active' ? 'emerald' : doc.status === 'pending' ? 'amber' : 'rose'} size="sm">
                      {doc.status}
                    </Badge>
                    <GlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDeleteDoctor(doc.id, doc.fullName)}
                      className="text-xs text-rose-600 px-2"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* TAB 6: AUDIT TRAIL / JOURNAL D'AUDIT LÉGAL */}
        {activeTab === 'audit' && (() => {
          const filteredLogs = auditLogs.filter(log => {
            // Filtre par catégorie
            if (auditFilter === 'doctors' && log.targetType !== 'doctor') return false;
            if (auditFilter === 'medications' && log.targetType !== 'medication') return false;
            if (auditFilter === 'licenses' && log.action !== 'renew_license') return false;

            // Filtre par recherche textuelle
            if (auditSearch.trim()) {
              const q = auditSearch.toLowerCase();
              const matchTarget = log.targetName.toLowerCase().includes(q);
              const matchEmail = log.adminEmail.toLowerCase().includes(q);
              const matchDetails = (log.details || '').toLowerCase().includes(q);
              const matchReason = (log.reason || '').toLowerCase().includes(q);
              return matchTarget || matchEmail || matchDetails || matchReason;
            }

            return true;
          });

          const getActionBadge = (action: any) => {
            switch (action) {
              case 'approve_doctor':
                return <Badge variant="emerald" size="sm">Homologation ONMS</Badge>;
              case 'reject_doctor':
                return <Badge variant="rose" size="sm">Candidature Rejetée</Badge>;
              case 'ban_doctor':
                return <Badge variant="rose" size="sm">Suspension Déontologique</Badge>;
              case 'unban_doctor':
                return <Badge variant="emerald" size="sm">Levée de Suspension</Badge>;
              case 'renew_license':
                return <Badge variant="amber" size="sm">Licence Prolongée</Badge>;
              case 'delete_doctor':
                return <Badge variant="slate" size="sm">Compte Supprimé</Badge>;
              case 'approve_medication':
                return <Badge variant="blue" size="sm">Médicament Homologué</Badge>;
              case 'reject_medication':
                return <Badge variant="slate" size="sm">Médicament Rejeté</Badge>;
              default:
                return <Badge variant="blue" size="sm">Action Administrative</Badge>;
            }
          };

          return (
            <GlassCard className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-sm">
                    <ScrollText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#0F172A]">
                      Journal d'Audit Médico-Légal ({auditLogs.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Traçabilité infalsifiable des décisions de la Direction Médicale et de l'Ordre National.
                    </p>
                  </div>
                </div>

                {/* Filtres & Recherche */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={e => setAuditSearch(e.target.value)}
                      placeholder="Rechercher praticien, motif..."
                      className="pl-8 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs focus:bg-white text-[#0F172A] w-full sm:w-56"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-[11px] font-bold">
                    <button
                      onClick={() => setAuditFilter('all')}
                      className={`px-3 py-1 rounded-full transition-all ${
                        auditFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setAuditFilter('doctors')}
                      className={`px-3 py-1 rounded-full transition-all ${
                        auditFilter === 'doctors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Médecins
                    </button>
                    <button
                      onClick={() => setAuditFilter('licenses')}
                      className={`px-3 py-1 rounded-full transition-all ${
                        auditFilter === 'licenses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Licences
                    </button>
                    <button
                      onClick={() => setAuditFilter('medications')}
                      className={`px-3 py-1 rounded-full transition-all ${
                        auditFilter === 'medications' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Médicaments
                    </button>
                  </div>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center rounded-[28px] bg-slate-50/50 border border-dashed border-slate-200">
                  <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#0F172A]">Aucun événement d'audit trouvé</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Les décisions administratives (homologations, rejets, prolongations) s'enregistreront automatiquement ici.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {filteredLogs.map(log => {
                    const dateObj = new Date(log.timestamp);
                    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const isPositive = log.action === 'approve_doctor' || log.action === 'unban_doctor' || log.action === 'approve_medication';
                    const isDanger = log.action === 'reject_doctor' || log.action === 'ban_doctor' || log.action === 'delete_doctor';

                    return (
                      <div key={log.id} className="relative group">
                        {/* Point sur la timeline */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ring-2 ${
                            isPositive
                              ? 'bg-emerald-500 ring-emerald-200'
                              : isDanger
                              ? 'bg-rose-500 ring-rose-200'
                              : 'bg-purple-500 ring-purple-200'
                          }`}
                        />

                        {/* Contenu de l'événement */}
                        <div className="p-4 rounded-[20px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getActionBadge(log.action)}
                              <strong className="text-sm font-bold text-[#0F172A]">
                                {log.targetName}
                              </strong>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({log.targetType === 'doctor' ? 'Praticien' : 'Molécule'})
                              </span>
                            </div>

                            <span className="text-[11px] font-semibold text-slate-400">
                              {formattedDate}
                            </span>
                          </div>

                          {log.details && (
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {log.details}
                            </p>
                          )}

                          {log.reason && (
                            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-rose-900 text-xs">
                              <strong>Motif motivé :</strong> {log.reason}
                            </div>
                          )}

                          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 flex-wrap gap-2">
                            <span>
                              Signé par : <strong className="text-slate-600 font-mono">{log.adminEmail}</strong>
                            </span>
                            <span className="font-mono text-slate-300 text-[9px]">
                              ID : {log.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          );
        })()}
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
      {/* MODAL INSPECTION PIECE JUSTIFICATIVE PRATICIEN */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">
                    Justificatif : {inspectingDoc.fullName}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {inspectingDoc.verificationDocumentType === 'id_card'
                      ? 'Pièce d’Identité Officielle (CNI / Passeport)'
                      : 'Carte d’Inscription Ordre des Médecins (ONMS)'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Image Display */}
            <div className="rounded-[20px] overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center min-h-[280px] max-h-[480px]">
              {inspectingDoc.verificationDocumentUrl ? (
                <img
                  src={inspectingDoc.verificationDocumentUrl}
                  alt="Justificatif Médical"
                  className="w-full h-auto max-h-[480px] object-contain"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun fichier image disponible.
                </div>
              )}
            </div>

            {/* Doctor Info Summary */}
            <div className="p-4 rounded-[20px] bg-slate-50 border border-slate-100 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Spécialité</span>
                <span className="font-bold text-[#0F172A]">{inspectingDoc.speciality}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Situation Ordinale</span>
                <span className="font-bold text-[#0F172A]">
                  {inspectingDoc.onmsNumber ? `Inscrit ONMS (${inspectingDoc.onmsNumber})` : 'Jeune Diplômé d’État (CNI fournie)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">NIN</span>
                <span className="font-bold text-[#0F172A] font-mono">{inspectingDoc.nin}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Téléphone Wave / OM</span>
                <span className="font-bold text-emerald-700 font-mono">{inspectingDoc.phone}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setInspectingDoc(null)}
              >
                Fermer
              </GlassButton>

              {inspectingDoc.status === 'pending' && (
                <GlassButton
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => {
                    handleApproveDoctor(inspectingDoc.id, inspectingDoc.fullName);
                    setInspectingDoc(null);
                  }}
                  className="shadow-pill-emerald"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approuver le Praticien (+90j)
                </GlassButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Directe Praticien */}
      {showCreateDoctorModal && (
        <AdminCreateDoctorModal
          onClose={() => setShowCreateDoctorModal(false)}
          onSuccess={() => {
            loadData(true);
          }}
          adminEmail={user?.email || 'dr.thiam@telemed.sn'}
        />
      )}
    </div>
  );
}
