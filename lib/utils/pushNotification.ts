/**
 * Utilitaire Client pour les Notifications Web Push PWA (W3C / VAPID)
 */

import { VAPID_PUBLIC_KEY } from '@/lib/config/vapid';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DoctorPushRecord {
  id: string;
  doctorSlug: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convertit une clé VAPID base64 en Uint8Array pour le PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Vérifie si le terminal supporte le Web Push standard
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Retourne l'état de permission actuel
 */
export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Génère un identifiant déterministe pour une souscription
 */
function getSubscriptionDocId(doctorSlug: string, endpoint: string): string {
  // Hash court sécurisé basé sur l'endpoint
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) {
    hash = (hash << 5) - hash + endpoint.charCodeAt(i);
    hash |= 0;
  }
  const cleanHash = Math.abs(hash).toString(36);
  return `${doctorSlug}_${cleanHash}`;
}

/**
 * Souscrit le praticien aux notifications Web Push sur cet appareil
 */
export async function subscribeDoctorToPush(doctorSlug: string): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      message: 'Les notifications Push ne sont pas supportées sur ce navigateur.',
    };
  }

  try {
    // 1. Demande d'autorisation système
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        message: 'Permission de notification refusée ou ignorée.',
      };
    }

    // 2. Récupération du Service Worker actif
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      return {
        success: false,
        message: 'Service Worker non disponible.',
      };
    }

    // 3. Souscription auprès du Push Service (Google / Apple / Mozilla)
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return {
        success: false,
        message: 'Clés de souscription invalides générées par le navigateur.',
      };
    }

    // 4. Enregistrement dans Firestore (collection push_subscriptions)
    const docId = getSubscriptionDocId(doctorSlug, subJson.endpoint);
    const subRef = doc(db, 'push_subscriptions', docId);

    await setDoc(
      subRef,
      {
        id: docId,
        doctorSlug,
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 5. Envoi d'une notification de confirmation locale immédiate
    try {
      if (registration.showNotification) {
        registration.showNotification('TéléMed Sénégal 🟢', {
          body: 'Alertes Push activées avec succès sur cet appareil !',
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag: 'telemed-welcome',
        });
      }
    } catch (_) {}

    return { success: true };
  } catch (error: any) {
    console.error('Erreur souscription push:', error);
    return {
      success: false,
      message: error?.message || 'Erreur lors de la souscription aux notifications.',
    };
  }
}

/**
 * Désabonne le praticien sur cet appareil
 */
export async function unsubscribeDoctorFromPush(doctorSlug: string): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const docId = getSubscriptionDocId(doctorSlug, subscription.endpoint);
        await subscription.unsubscribe();

        // Supprimer l'entrée Firestore
        try {
          await deleteDoc(doc(db, 'push_subscriptions', docId));
        } catch (e) {
          console.warn('Notice suppression souscription Firestore:', e);
        }
      }
    }
    return true;
  } catch (err) {
    console.warn('Erreur désinscription push:', err);
    return false;
  }
}

/**
 * Vérifie si le terminal actuel est déjà abonné pour ce praticien
 */
export async function checkDoctorPushStatus(doctorSlug: string): Promise<{
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}> {
  if (!isPushNotificationSupported()) {
    return {
      isSupported: false,
      permission: 'unsupported',
      isSubscribed: false,
    };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      isSupported: true,
      permission,
      isSubscribed: !!subscription,
    };
  } catch (e) {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
    };
  }
}
