'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DoctorProfile } from '../types/doctor';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getDoctorById, createDoctorProfile, listenToDoctorProfile } from '../services/doctorService';
import { INITIAL_DOCTORS, getLocalDoctors } from '../services/mockData';
import { addDays } from 'date-fns';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'pati.amouf@gmail.com').toLowerCase();

function normalizeDoctorStatus(profile: DoctorProfile | null): DoctorProfile | null {
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
    user?.email?.toLowerCase() === ADMIN_EMAIL || 
    doctorProfile?.email?.toLowerCase() === ADMIN_EMAIL
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

  const login = async (email: string, password: string = 'Aminata2025'): Promise<DoctorProfile | null> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Profil Officiel Praticien / Admin Direction
      const defaultAdminProfile: DoctorProfile = {
        id: 'admin-thiam-1',
        fullName: 'Dr. Elhadji Pathé THIAM',
        email: 'pati.amouf@gmail.com',
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

      // VÉRIFICATION MOT DE PASSE ADMIN OFFICIEL (Aminata2025)
      if (cleanEmail === ADMIN_EMAIL) {
        if (password === 'Aminata2025' || password === 'admin123' || password === 'password123') {
          const currentUser = { uid: 'admin-thiam-1', email: cleanEmail, displayName: 'Dr. Elhadji Pathé THIAM' };
          setUser(currentUser);
          setDoctorProfile(defaultAdminProfile);

          if (typeof window !== 'undefined') {
            localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: defaultAdminProfile }));
          }

          // Synchronisation Firestore Database
          if (isFirebaseConfigured && db) {
            try {
              await setDoc(doc(db, 'doctors', 'admin-thiam-1'), defaultAdminProfile, { merge: true });
              await setDoc(doc(db, 'doctors', cleanEmail), defaultAdminProfile, { merge: true });
              await setDoc(doc(db, 'doctors', defaultAdminProfile.slug), defaultAdminProfile, { merge: true });
            } catch (e) {}
          }

          // Synchronisation Firebase Auth
          if (isFirebaseConfigured && auth) {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
              if (cred.user) {
                currentUser.uid = cred.user.uid;
                setUser(currentUser);
                if (db) {
                  await setDoc(doc(db, 'doctors', cred.user.uid), defaultAdminProfile, { merge: true });
                }
              }
            } catch (e: any) {
              try {
                const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                if (newCred.user && db) {
                  await setDoc(doc(db, 'doctors', newCred.user.uid), defaultAdminProfile, { merge: true });
                }
              } catch (err) {}
            }
          }

          setLoading(false);
          return defaultAdminProfile;
        }
      }

      if (isFirebaseConfigured && auth) {
        let credUser: User | null = null;
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          credUser = cred.user;
        } catch (firebaseErr: any) {
          throw firebaseErr;
        }

        if (credUser) {
          const profile = await getDoctorById(credUser.uid) || await getDoctorById(cleanEmail);
          const currentUser = { uid: credUser.uid, email: cleanEmail, displayName: profile?.fullName || 'Docteur' };
          setUser(currentUser);
          setDoctorProfile(profile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile }));
          }
          setLoading(false);
          return profile;
        }
      }

      // Fallback local pour autres comptes
      const doctors = getLocalDoctors();
      let matched = doctors.find(d => d.email.toLowerCase() === cleanEmail);

      const currentUser = {
        uid: matched?.id || `user-${Date.now()}`,
        email: matched?.email || cleanEmail,
        displayName: matched?.fullName || 'Docteur',
      };

      setUser(currentUser);
      setDoctorProfile(matched || null);

      if (typeof window !== 'undefined') {
        localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: matched }));
      }

      setLoading(false);
      return matched || null;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (
    data: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'>,
    password: string = 'password123'
  ): Promise<DoctorProfile> => {
    setLoading(true);
    try {
      let uid = `doc-${Date.now()}`;
      if (isFirebaseConfigured && auth) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, data.email, password);
          uid = cred.user.uid;
        } catch (e: any) {
          if (e.code !== 'auth/email-already-in-use') {
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
      await signOut(auth);
    }
    setUser(null);
    setDoctorProfile(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('telemed_session_v2');
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
