'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    // 1. Vérification si déjà en mode application installée (standalone)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Vérification si l'utilisateur a fermé récemment la bannière (< 5 jours)
    const dismissedAt = localStorage.getItem('telemed_pwa_dismissed');
    if (dismissedAt) {
      const fiveDays = 5 * 24 * 60 * 60 * 1000;
      if (Date.now() - Number(dismissedAt) < fiveDays) {
        return;
      }
    }

    // 3. Détection iOS (Safari sur iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Sur iOS, on affiche la bannière après un court délai d'immersion
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Détection Android / Chrome / Edge via beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('telemed_pwa_dismissed', Date.now().toString());
    }
  };

  if (!mounted || isStandalone || !showBanner) {
    return null;
  }

  return (
    <>
      {/* BANNIÈRE FLOTTANTE D'INSTALLATION */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100">
        <div className="p-4 rounded-[24px] bg-[#0B132B]/95 backdrop-blur-2xl border border-blue-500/30 shadow-2xl shadow-blue-950/60 text-white flex items-center justify-between gap-3">
          {/* Logo Icône */}
          <div className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-blue-600 via-sky-500 to-emerald-400 p-0.5 flex-shrink-0 shadow-lg shadow-blue-500/25">
            <div className="w-full h-full bg-[#0F172A] rounded-[16px] flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-sky-400" />
            </div>
          </div>

          {/* Titre & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-wide truncate">
                Application TéléMed Sénégal
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Gratuit
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              Accès rapide en 1 clic & ordonnances hors-ligne
            </p>
          </div>

          {/* Boutons d'Action */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-sky-400 hover:from-blue-600 hover:to-sky-500 text-white text-xs font-extrabold shadow-md shadow-blue-500/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL GUIDE D'INSTALLATION POUR IPHONE / IPAD (SAFARI) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0B132B] border border-blue-500/30 rounded-[28px] p-6 text-white shadow-2xl space-y-5 transform transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sky-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Installer sur iPhone</h3>
                  <p className="text-[11px] text-slate-400">Ajouter à l'écran d'accueil</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Appuyez sur <Share className="w-4 h-4 text-sky-400 inline" /> Partager
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dans la barre du bas de Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Sélectionnez <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> Sur l'écran d'accueil
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Faites défiler le menu des options vers le bas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Appuyez sur <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" /> Ajouter
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    En haut à droite de l'écran
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-colors cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
