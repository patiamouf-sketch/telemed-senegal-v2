'use client';

import { useEffect } from 'react';

/**
 * Enregistre le Service Worker PWA de manière asynchrone et non-bloquante
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = () => {
      try {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ Service Worker TéléMed enregistré, scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('Notice Service Worker registration:', error);
          });
      } catch (err) {
        console.warn('Service Worker catch:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  return null;
}

