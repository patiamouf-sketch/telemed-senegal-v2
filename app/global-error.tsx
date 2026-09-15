'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur globale interceptée:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-[#1E293B]">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 border border-rose-100">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Système de Sécurité TELEMED
            </span>
            <h1 className="text-xl font-extrabold text-slate-900">
              Interruption Critique Interceptée
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Le système a sécurisé votre session médicale. Cliquez ci-dessous pour recharger l'application en mode protégé.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md transition-all"
            >
              Recharger l'application
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all"
            >
              Page d'accueil
            </button>
          </div>

          <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            Direction Médicale : <strong>+221 78 106 92 98</strong>
          </p>
        </div>
      </body>
    </html>
  );
}
