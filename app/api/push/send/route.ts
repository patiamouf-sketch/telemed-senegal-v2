import { NextResponse } from 'next/server';
import webpush from 'web-push';
import {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
} from '@/lib/config/vapid';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Initialisation globale de la configuration VAPID
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('Erreur initialisation VAPID webpush:', err);
  }
}

/**
 * Nettoie une chaîne de texte pour éviter toute injection dans les notifications
 */
function sanitizeNotificationText(input: string, maxLength: number = 200): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Valide et sécurise l'URL de redirection de la notification push
 */
function sanitizeRedirectUrl(url?: string): string {
  if (!url) return '/dashboard';
  const clean = url.trim();
  // Autoriser uniquement les chemins relatifs internes
  if (clean.startsWith('/') && !clean.startsWith('//') && !clean.includes('\\')) {
    return clean;
  }
  return '/dashboard';
}

export async function POST(request: Request) {
  try {
    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      return NextResponse.json(
        { error: 'Clés VAPID non configurées sur le serveur.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { doctorSlug, title, body: contentText, url, tag } = body;

    if (!doctorSlug || !title || !contentText) {
      return NextResponse.json(
        { error: 'Paramètres manquants : doctorSlug, title et body sont requis.' },
        { status: 400 }
      );
    }

    // Assainissement strict des entrées
    const safeDoctorSlug = sanitizeNotificationText(doctorSlug, 100);
    const safeTitle = sanitizeNotificationText(title, 80);
    const safeBody = sanitizeNotificationText(contentText, 250);
    const safeUrl = sanitizeRedirectUrl(url);
    const safeTag = sanitizeNotificationText(tag || 'telemed-alert', 50);

    if (!db) {
      return NextResponse.json(
        { error: 'Base de données Firestore non disponible.' },
        { status: 500 }
      );
    }

    // Récupération des abonnements actifs pour ce médecin
    const subsRef = collection(db, 'push_subscriptions');
    const q = query(subsRef, where('doctorSlug', '==', safeDoctorSlug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: 'Aucun appareil abonné pour ce praticien.',
      });
    }

    const payload = JSON.stringify({
      title: safeTitle,
      body: safeBody,
      url: safeUrl,
      tag: safeTag,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    });

    let sentCount = 0;
    let removedCount = 0;

    const promises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) {
        return;
      }

      const pushSubscription = {
        endpoint: data.endpoint,
        keys: {
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (err: any) {
        // Nettoyage automatique des abonnements expirés (410 Gone ou 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          if (db) {
            try {
              await deleteDoc(doc(db, 'push_subscriptions', docSnap.id));
              removedCount++;
            } catch (delErr) {
              console.warn('Erreur suppression souscription expirée:', delErr);
            }
          }
        } else {
          console.warn('Erreur envoi notification push sur endpoint:', err?.message || err);
        }
      }
    });

    await Promise.allSettled(promises);

    return NextResponse.json({
      success: true,
      sentCount,
      removedCount,
      totalDevices: snapshot.size,
    });
  } catch (error: any) {
    console.error('Erreur API /api/push/send:', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de l\'envoi push.', details: error?.message },
      { status: 500 }
    );
  }
}
