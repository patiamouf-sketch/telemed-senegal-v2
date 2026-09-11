import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAkZAm-7-R10BaYjJsjR5wg79If7gM1s2U',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'telemed-senegal-v2.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'telemed-senegal-v2',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'telemed-senegal-v2.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '484967187891',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:484967187891:web:ffa200e3fb240f1eb3b7c6',
};

// Vérifie si la configuration est active avec de véritables clés
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your-api-key' &&
  firebaseConfig.apiKey !== 'demo-api-key'
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
  } catch (errInit) {
    db = getFirestore(app);
  }
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

/**
 * Diagnostic de connectivité Cloud Firestore en direct
 */
export async function checkFirestoreHealth(): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return { ok: false, message: 'Firebase non configuré ou instance DB absente' };
  }
  try {
    await getDoc(doc(db, 'system_health', 'ping'));
    return { ok: true, message: 'Connecté à Cloud Firestore' };
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.code === 'not-found') {
      return { ok: true, message: `Connecté à Cloud Firestore (${error.code})` };
    }
    return { ok: false, message: error?.message || 'Erreur de connexion Firestore' };
  }
}

export { app, auth, db, storage };

