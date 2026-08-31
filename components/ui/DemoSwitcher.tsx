'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ShieldCheck, User, Clock, CheckCircle2, ChevronUp, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function DemoSwitcher() {
  const { user, doctorProfile, isAdmin, switchDemoUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden font-sans">
      <div className="bg-white/90 backdrop-blur-xl border border-sky-200/80 shadow-2xl shadow-sky-950/15 rounded-[24px] overflow-hidden transition-all duration-300">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-medical-600 transition-colors w-full text-left"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-medical-600" />
            Mode Démo / Simulateur de Rôles
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4 ml-auto text-slate-400" /> : <ChevronUp className="w-4 h-4 ml-auto text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-3.5 pt-1 border-t border-slate-100/80 space-y-2 text-xs w-72">
            <div className="bg-sky-50/70 p-2.5 rounded-[16px] text-slate-600 mb-2">
              <span className="font-semibold text-medical-900 block">État Actuel :</span>
              {user ? (
                <div className="mt-0.5 space-y-0.5">
                  <p className="truncate font-medium text-slate-800">{doctorProfile?.fullName || user.email}</p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    Statut : <span className="font-semibold text-medical-600">{doctorProfile?.status || 'standard'}</span>
                    {isAdmin && ' (Super-Admin)'}
                  </p>
                </div>
              ) : (
                <span className="text-slate-500 italic">Visiteur non connecté (Landing Page)</span>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={() => switchDemoUser('admin')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[14px] text-left transition-all ${
                  isAdmin ? 'bg-medical-600 text-white font-medium shadow-md shadow-sky-500/20' : 'hover:bg-sky-50 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <div className="truncate">
                  <div className="font-semibold">Super-Admin (Dr Thiam)</div>
                  <div className="text-[10px] opacity-80">Validation ONMS & Licences</div>
                </div>
              </button>

              <button
                onClick={() => switchDemoUser('active')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[14px] text-left transition-all ${
                  doctorProfile?.status === 'active' && !isAdmin
                    ? 'bg-medical-600 text-white font-medium shadow-md shadow-sky-500/20'
                    : 'hover:bg-sky-50 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <div className="truncate">
                  <div className="font-semibold">Médecin Actif (Dr Sow)</div>
                  <div className="text-[10px] opacity-80">Dashboard & Lien /dr/dr-sow</div>
                </div>
              </button>

              <button
                onClick={() => switchDemoUser('pending')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[14px] text-left transition-all ${
                  doctorProfile?.status === 'pending'
                    ? 'bg-medical-600 text-white font-medium shadow-md shadow-sky-500/20'
                    : 'hover:bg-sky-50 text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <div className="truncate">
                  <div className="font-semibold">Médecin En Attente (Dr Fall)</div>
                  <div className="text-[10px] opacity-80">Écran d'attente validation</div>
                </div>
              </button>

              <button
                onClick={() => switchDemoUser('anonymous')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[14px] text-left transition-all ${
                  !user ? 'bg-slate-800 text-white font-medium' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="font-semibold">Visiteur Déconnecté</div>
                  <div className="text-[10px] opacity-80">Landing Page & Adhésion</div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <Link href="/admin-thiam" className="hover:text-medical-600 flex items-center gap-1 font-medium underline">
                Route /admin-thiam <ExternalLink className="w-3 h-3" />
              </Link>
              <Link href="/dr/dr-sow" className="hover:text-medical-600 flex items-center gap-1 font-medium underline">
                Lien Patient <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
