'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { Navbar } from '@/components/ui/Navbar';
import { DemoSwitcher } from '@/components/ui/DemoSwitcher';
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
  ArrowLeft
} from 'lucide-react';
import { getAllDoctors, approveDoctor, rejectDoctor, renewDoctorLicense, getAdminStats } from '@/lib/services/adminService';
import { DoctorProfile, AdminStats } from '@/lib/types/doctor';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function AdminThiamPage() {
  const { user, doctorProfile, isAdmin } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'all'>('pending');

  const loadData = async () => {
    setLoading(true);
    const docs = await getAllDoctors();
    const st = await getAdminStats();
    setDoctors(docs);
    setStats(st);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (docId: string, docName: string) => {
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

  const handleReject = async (docId: string) => {
    const reason = prompt('Motif du rejet :', 'Numéro ONMS non vérifiable ou dossier incomplet');
    if (!reason) return;
    setActionLoading(docId);
    await rejectDoctor(docId, reason);
    await loadData();
    setActionLoading(null);
  };

  const handleRenew = async (docId: string) => {
    setActionLoading(docId);
    await renewDoctorLicense(docId, 90);
    await loadData();
    setActionLoading(null);
  };

  const pendingDocs = doctors.filter(d => d.status === 'pending');
  const activeDocs = doctors.filter(d => d.status === 'active' && d.id !== 'admin-thiam-1');

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
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                  Espace Super-Admin • Dr. Thiam
                  <Badge variant="amber" size="sm">
                    Thiam Global Business
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500">
                  Validation des accréditations médicales (ONMS / NIN) et octroi des licences 90 jours.
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
              Actualiser la liste
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
            <span className="text-[11px] text-emerald-700/80 font-medium">Licence valide</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Candidatures</span>
              <Users className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-3xl font-extrabold text-[#0F172A]">
              {stats?.totalDoctors ?? doctors.length}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Praticiens libéraux</span>
          </GlassCard>

          <GlassCard className="p-5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consultations</span>
              <Sparkles className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-3xl font-extrabold text-[#3B82F6]">
              {stats?.activePatientsToday ?? 42}
            </div>
            <span className="text-[11px] text-blue-700/80 font-medium">Prises en charge</span>
          </GlassCard>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Candidatures en attente ({pendingDocs.length})
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

        {/* Tab 1: Pending Approvals */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingDocs.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#0F172A]">Toutes les demandes ont été traitées !</h3>
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

                    {/* Verification Details Box */}
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
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> NIN (Identité) :
                        </span>
                        <strong className="font-mono text-[#0F172A] font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          {doc.nin}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" /> Téléphone Wave/OM :
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

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(doc.id)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter
                      </GlassButton>

                      <GlassButton
                        variant="success"
                        size="sm"
                        onClick={() => handleApprove(doc.id, doc.fullName)}
                        isLoading={actionLoading === doc.id}
                        className="text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approuver (+90j Licence)
                      </GlassButton>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Active Doctors & Licenses */}
        {activeTab === 'active' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeDocs.map(doc => {
              const expiry = doc.licenseExpiresAt ? new Date(doc.licenseExpiresAt) : new Date();
              const daysLeft = Math.max(0, differenceInDays(expiry, new Date()));

              return (
                <GlassCard key={doc.id} className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="emerald" size="sm" className="mb-1">
                        Actif • ONMS Certifié
                      </Badge>
                      <h3 className="font-extrabold text-[#0F172A] text-base">{doc.fullName}</h3>
                      <p className="text-xs text-[#3B82F6] font-bold">{doc.speciality}</p>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-xs">
                      {daysLeft}j
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[20px] bg-white border border-slate-100 text-xs space-y-1.5 shadow-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">N° ONMS :</span>
                      <span className="font-mono font-bold text-[#0F172A]">{doc.onmsNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lien public :</span>
                      <Link href={`/dr/${doc.slug}`} target="_blank" className="text-[#3B82F6] underline font-mono">
                        /dr/{doc.slug}
                      </Link>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fin de licence :</span>
                      <span className="font-bold text-[#0F172A]">
                        {format(expiry, 'dd/MM/yyyy')} ({daysLeft} jours)
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Offre Thiam Global</span>
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRenew(doc.id)}
                      isLoading={actionLoading === doc.id}
                      className="text-xs"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      +90 Jours
                    </GlassButton>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Tab 3: All Doctors */}
        {activeTab === 'all' && (
          <GlassCard className="p-6 overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1E293B]">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Praticien</th>
                  <th className="py-3 px-3">Spécialité</th>
                  <th className="py-3 px-3">N° ONMS / NIN</th>
                  <th className="py-3 px-3">Téléphone Wave</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map(doc => (
                  <tr key={doc.id} className="hover:bg-blue-50/30">
                    <td className="py-3.5 px-3 font-bold text-[#0F172A]">{doc.fullName}</td>
                    <td className="py-3.5 px-3">{doc.speciality}</td>
                    <td className="py-3.5 px-3 font-mono">
                      {doc.onmsNumber} <br />
                      <span className="text-[10px] text-slate-400">{doc.nin}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">{doc.phone}</td>
                    <td className="py-3.5 px-3">
                      <Badge
                        variant={
                          doc.status === 'active'
                            ? 'emerald'
                            : doc.status === 'pending'
                            ? 'amber'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      {doc.status === 'pending' && (
                        <GlassButton
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(doc.id, doc.fullName)}
                          isLoading={actionLoading === doc.id}
                          className="text-xs"
                        >
                          Approuver
                        </GlassButton>
                      )}
                      {doc.status === 'active' && (
                        <Link href={`/dr/${doc.slug}`} target="_blank">
                          <GlassButton variant="glass" size="sm" className="text-xs">
                            Voir salle
                          </GlassButton>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )}
      </main>

      <DemoSwitcher />
    </div>
  );
}
