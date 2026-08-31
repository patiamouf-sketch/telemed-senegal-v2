'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Badge } from '../ui/Badge';
import { Stethoscope, Mail, Lock, LogIn, X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
  onSwitchToSignup?: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ onClose, onSwitchToSignup, onSuccess }: AuthModalProps) {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects ou compte introuvable.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoRole: 'admin' | 'active' | 'pending') => {
    switchDemoUser(demoRole);
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md font-sans">
      <GlassCard className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/80 p-6 sm:p-8 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/20 mb-3">
            <Stethoscope className="w-6 h-6" />
          </div>
          <Badge variant="blue" className="mb-2">
            Connexion Sécurisée
          </Badge>
          <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Espace Médecin</h2>
          <p className="text-xs text-slate-500 mt-1">
            Accédez à votre cabinet virtuel et à vos téléconsultations.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#3B82F6]" /> Email Professionnel
            </label>
            <input
              type="email"
              required
              placeholder="dr.nom@telemed.sn"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#3B82F6]" /> Mot de passe
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-[20px] bg-white border border-slate-200/80 focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-[#0F172A] shadow-sm"
            />
          </div>

          <GlassButton type="submit" variant="primary" size="md" isLoading={loading} className="w-full mt-2">
            <LogIn className="w-4 h-4" />
            Se connecter
          </GlassButton>
        </form>

        {/* Quick Demo Logins for fast testing */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-[#3B82F6]" /> Accès Rapide Démo
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('active')}
              className="p-2.5 rounded-full bg-blue-50/70 hover:bg-blue-100/80 border border-blue-100 text-[11px] text-center text-[#0F172A] font-bold transition-all"
            >
              Dr Sow (Actif)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('pending')}
              className="p-2.5 rounded-full bg-amber-50/70 hover:bg-amber-100/80 border border-amber-100 text-[11px] text-center text-[#0F172A] font-bold transition-all"
            >
              Dr Fall (Attente)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-2.5 rounded-full bg-purple-50/70 hover:bg-purple-100/80 border border-purple-100 text-[11px] text-center text-[#0F172A] font-bold transition-all"
            >
              Dr Thiam (Admin)
            </button>
          </div>
        </div>

        {onSwitchToSignup && (
          <div className="mt-5 text-center text-xs text-slate-500">
            Pas encore inscrit ?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-[#3B82F6] font-bold hover:underline"
            >
              Faire une demande d'adhésion
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
