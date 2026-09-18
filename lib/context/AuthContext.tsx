'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DoctorProfile } from '../types/doctor';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getDoctorById, createDoctorProfile, listenToDoctorProfile } from '../services/doctorService';
import { INITIAL_DOCTORS, getLocalDoctors } from '../services/mockData';
import { addDays } from 'date-fns';

// Liste canonique des emails administrateurs autorisés (conforme à firestore.rules & storage.rules)
export const ADMIN_EMAILS = [
  'pati.amouf@gmail.com',
  'dr.thiam@telemed.sn',
  (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean);

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean);
}

function normalizeDoctorStatus(profile: DoctorProfile): DoctorProfile;
function normalizeDoctorStatus(profile: null | undefined): null;
function normalizeDoctorStatus(profile: DoctorProfile | null | undefined): DoctorProfile | null;
function normalizeDoctorStatus(profile: DoctorProfile | null | undefined): DoctorProfile | null {
  if (!profile) return null;
  return profile;
}

interface AuthContextType {
  user: { uid: string; email: string; displayName?: string } | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password?: string) => Promise<DoctorProfile | null>;
  signup: (data: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'>, password?: string) => Promise<DoctorProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ uid: string; email: string; displayName?: string } | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = Boolean(
    isUserAdmin(user?.email) || 
    isUserAdmin(doctorProfile?.email)
  );

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setDoctorProfile(null);
      return;
    }
    try {
      // Requête multi-clés UID et Email pour garantir de récupérer le document actif
      const [byId, byEmail] = await Promise.all([
        getDoctorById(doctorProfile?.id || user.uid),
        user.email ? getDoctorById(user.email) : Promise.resolve(null)
      ]);
      const rawProfile = (byId?.status === 'active' ? byId : byEmail?.status === 'active' ? byEmail : byId || byEmail);
      const profile = normalizeDoctorStatus(rawProfile);
      if (profile) {
        setDoctorProfile(prev => {
          if (
            prev &&
            prev.id === profile.id &&
            prev.status === profile.status &&
            prev.licenseExpiresAt === profile.licenseExpiresAt
          ) {
            return prev;
          }
          return profile;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('telemed_session_v2', JSON.stringify({ user, profile }));
        }
      }
    } catch (err) {
      console.warn('refreshProfile notice:', err);
    }
  }, [user?.uid, user?.email, doctorProfile?.id]);

  // Écouteur Firestore direct en temps réel stabilisé
  useEffect(() => {
    if (!user) return;
    const targetKey = user.email || user.uid;
    if (!targetKey) return;

    const unsub = listenToDoctorProfile(targetKey, (updatedProfile) => {
      if (updatedProfile) {
        const normalized = normalizeDoctorStatus(updatedProfile);
        if (!normalized) return;
        setDoctorProfile(prev => {
          if (
            prev &&
            prev.id === normalized.id &&
            prev.status === normalized.status &&
            prev.licenseExpiresAt === normalized.licenseExpiresAt
          ) {
            return prev;
          }
          return normalized;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('telemed_session_v2', JSON.stringify({ user, profile: normalized }));
        }
      }
    });

    return () => {
      try { unsub(); } catch (e) {}
    };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      // 1. Restauration synchrone et immédiate depuis la session locale
      if (typeof window !== 'undefined') {
        try {
          const savedSession = localStorage.getItem('telemed_session_v2');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed.user) {
              setUser(parsed.user);
              if (parsed.profile) {
                setDoctorProfile(normalizeDoctorStatus(parsed.profile));
              }
              // Déverrouillage immédiat si une session locale existe
              setLoading(false);
              // Rafraîchissement asynchrone non-bloquant en arrière-plan (UID + Email)
              Promise.all([
                getDoctorById(parsed.user.uid),
                parsed.user.email ? getDoctorById(parsed.user.email) : Promise.resolve(null)
              ]).then(([freshById, freshByEmail]) => {
                const fresh = (freshById?.status === 'active' ? freshById : freshByEmail?.status === 'active' ? freshByEmail : freshById || freshByEmail);
                if (fresh) {
                  const normalized = normalizeDoctorStatus(fresh);
                  setDoctorProfile(normalized);
                  localStorage.setItem('telemed_session_v2', JSON.stringify({ user: parsed.user, profile: normalized }));
                }
              }).catch(() => {});
            }
          }
        } catch (e) {}
      }

      // Timer de sécurité : garantit la levée du spinner après 600ms quoi qu'il arrive
      const safetyTimer = setTimeout(() => {
        setLoading(false);
      }, 600);

      if (isFirebaseConfigured && auth) {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
          try {
            if (firebaseUser) {
              const currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || undefined,
              };
              setUser(currentUser);
              const [profileById, profileByEmail] = await Promise.all([
                getDoctorById(firebaseUser.uid),
                firebaseUser.email ? getDoctorById(firebaseUser.email) : Promise.resolve(null)
              ]);
              const raw = (profileById?.status === 'active' ? profileById : profileByEmail?.status === 'active' ? profileByEmail : profileById || profileByEmail);
              const normalized = normalizeDoctorStatus(raw);
              setDoctorProfile(normalized);
              if (typeof window !== 'undefined') {
                localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: normalized }));
              }
            }
          } catch (err) {
            console.warn('onAuthStateChanged profile sync notice:', err);
          } finally {
            clearTimeout(safetyTimer);
            setLoading(false);
          }
        });
      } else {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<DoctorProfile | null> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!password || password.trim() === '') {
        throw new Error('Veuillez saisir votre mot de passe pour vous connecter.');
      }

      // 1. Authentification Firebase Authentication stricte
      if (isFirebaseConfigured && auth) {
        let credUser: User | null = null;
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          credUser = cred.user;
        } catch (firebaseErr: any) {
          if (
            firebaseErr.code === 'auth/user-not-found' ||
            firebaseErr.code === 'auth/invalid-credential' ||
            firebaseErr.code === 'auth/invalid-login-credentials'
          ) {
            throw new Error('Identifiants incorrects ou compte praticien introuvable.');
          } else if (firebaseErr.code === 'auth/wrong-password') {
            throw new Error('Mot de passe incorrect.');
          } else if (firebaseErr.code === 'auth/too-many-requests') {
            throw new Error('Trop de tentatives infructueuses. Veuillez patienter quelques instants.');
          } else {
            throw new Error(firebaseErr?.message || 'Erreur lors de la connexion sécurisée.');
          }
        }

        if (credUser) {
          const [profileByUid, profileByEmail] = await Promise.all([
            getDoctorById(credUser.uid),
            getDoctorById(cleanEmail)
          ]);
          const rawProfile = (profileByUid?.status === 'active' ? profileByUid : profileByEmail?.status === 'active' ? profileByEmail : profileByUid || profileByEmail);
          let profile = normalizeDoctorStatus(rawProfile);

          // Si c'est un compte administrateur accrédité sans profil Firestore
          if (!profile && isUserAdmin(cleanEmail)) {
            profile = {
              id: credUser.uid,
              fullName: credUser.displayName || 'Dr. Elhadji Pathé THIAM',
              email: cleanEmail,
              phone: '+221 78 106 92 98',
              nin: '1985031500001',
              speciality: 'Médecine Générale',
              onmsNumber: '',
              clinicName: '',
              city: 'Dakar',
              consultationFee: 15000,
              availableForTeleconsult: true,
              slug: 'dr-elhadji-pathe-thiam',
              status: 'active',
              role: 'admin',
              licenseExpiresAt: '2099-12-31T23:59:59.000Z',
              createdAt: new Date().toISOString(),
            };
          }

          if (!profile) {
            const localDoctors = getLocalDoctors();
            const matchedLocal = localDoctors.find(d => d.email.toLowerCase() === cleanEmail);
            if (matchedLocal) {
              profile = matchedLocal;
            }
          }

          const currentUser = {
            uid: credUser.uid,
            email: cleanEmail,
            displayName: profile?.fullName || credUser.displayName || 'Praticien',
          };

          setUser(currentUser);
          setDoctorProfile(profile);

          if (db && profile) {
            try {
              await setDoc(doc(db, 'doctors', credUser.uid), profile, { merge: true });
              await setDoc(doc(db, 'doctors', cleanEmail), profile, { merge: true });
            } catch (e) {}
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile }));
          }

          setLoading(false);
          return profile;
        }
      }

      // 2. Fallback environnement hors-ligne / développement local (uniquement si Firebase non configuré)
      if (!isFirebaseConfigured) {
        const doctors = getLocalDoctors();
        const matched = doctors.find(d => d.email.toLowerCase() === cleanEmail);
        const currentUser = {
          uid: matched?.id || `user-${Date.now()}`,
          email: matched?.email || cleanEmail,
          displayName: matched?.fullName || 'Praticien Démo',
        };

        setUser(currentUser);
        setDoctorProfile(matched || null);

        if (typeof window !== 'undefined') {
          localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: matched }));
        }

        setLoading(false);
        return matched || null;
      }

      throw new Error('Service d\'authentification indisponible.');
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (
    data: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'>,
    password?: string
  ): Promise<DoctorProfile> => {
    setLoading(true);
    try {
      const cleanPassword = password || `Telemed@${Math.random().toString(36).slice(-8)}!`;
      let uid = `doc-${Date.now()}`;
      if (isFirebaseConfigured && auth) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, data.email, cleanPassword);
          uid = cred.user.uid;
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
            try {
              const existingCred = await signInWithEmailAndPassword(auth, data.email, cleanPassword);
              uid = existingCred.user.uid;
            } catch (loginErr) {}
          } else {
            console.warn('Firebase signup notice:', e);
          }
        }
      }

      const created = await createDoctorProfile(data, uid);
      const currentUser = {
        uid: created.id,
        email: created.email,
        displayName: created.fullName,
      };

      setUser(currentUser);
      setDoctorProfile(created);

      if (typeof window !== 'undefined') {
        localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: created }));
      }

      setLoading(false);
      return created;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Erreur lors de la déconnexion Firebase:', err);
      }
    }
    setUser(null);
    setDoctorProfile(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('telemed_session_v2');
      localStorage.removeItem('telemed_active_consultation');
      sessionStorage.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        doctorProfile,
        loading,
        isAdmin,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
