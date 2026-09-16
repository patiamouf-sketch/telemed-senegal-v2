'use client';

import { useEffect } from 'react';

/**
 * Enregistre le Service Worker PWA de manière asynchrone et non-bloquante
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ Service Worker TéléMed enregistré avec succès, scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('Notice Service Worker registration:', error);
          });
      });
    }
  }, []);

  return null;
}
