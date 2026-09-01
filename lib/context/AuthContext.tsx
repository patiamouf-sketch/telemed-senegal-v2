'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DoctorProfile } from '../types/doctor';
import { auth, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getDoctorById, createDoctorProfile, listenToDoctorProfile } from '../services/doctorService';
import { INITIAL_DOCTORS, getLocalDoctors } from '../services/mockData';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'pati.amouf@gmail.com').toLowerCase();

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
    const profile = await getDoctorById(doctorProfile?.id || user.uid) || await getDoctorById(user.email);
    if (profile) {
      setDoctorProfile(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('telemed_session_v2', JSON.stringify({ user, profile }));
      }
    }
  }, [user, doctorProfile?.id]);

  // Écouteur Firestore direct en temps réel sur le document du médecin
  useEffect(() => {
    if (!user) return;
    const targetKey = doctorProfile?.id || user.uid || user.email;
    if (!targetKey) return;

    const unsub = listenToDoctorProfile(targetKey, (updatedProfile) => {
      if (updatedProfile) {
        setDoctorProfile(updatedProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('telemed_session_v2', JSON.stringify({ user, profile: updatedProfile }));
        }
      }
    });

    return () => unsub();
  }, [user?.uid, user?.email, doctorProfile?.id]);

  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        try {
          const savedSession = localStorage.getItem('telemed_session_v2');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed.user) {
              setUser(parsed.user);
              const freshProfile = await getDoctorById(parsed.user.uid) || await getDoctorById(parsed.user.email) || parsed.profile;
              setDoctorProfile(freshProfile);
            }
          }
        } catch (e) {}
      }

      if (isFirebaseConfigured && auth) {
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
          if (firebaseUser) {
            const currentUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || undefined,
            };
            setUser(currentUser);
            const profile = await getDoctorById(firebaseUser.uid) || await getDoctorById(firebaseUser.email || '');
            setDoctorProfile(profile);
            if (typeof window !== 'undefined') {
              localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile }));
            }
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string = 'password123'): Promise<DoctorProfile | null> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Création du profil Admin par défaut si nécessaire
      const defaultAdminProfile: DoctorProfile = {
        id: 'admin-thiam-1',
        fullName: 'Dr. Elhadji Pathé THIAM',
        email: 'pati.amouf@gmail.com',
        phone: '+221 78 106 92 98',
        speciality: 'Direction Médicale • Pharmacien & Informaticien',
        onmsNumber: 'ONMS-DIR-001',
        clinicName: 'Direction Générale THIAM GLOBAL BUSINESS',
        city: 'Dakar',
        consultationFee: 15000,
        slug: 'dr-elhadji-pathe-thiam',
        status: 'active',
        role: 'doctor',
        licenseExpiresAt: '2099-12-31T23:59:59.000Z',
        createdAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured && auth) {
        let credUser: User | null = null;
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          credUser = cred.user;
        } catch (firebaseErr: any) {
          // Si c'est l'email admin et que le compte n'existe pas encore dans Firebase Auth, on le crée automatiquement
          if (cleanEmail === ADMIN_EMAIL && (
            firebaseErr.code === 'auth/user-not-found' ||
            firebaseErr.code === 'auth/invalid-credential' ||
            firebaseErr.code === 'auth/invalid-login-credentials'
          )) {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
              credUser = newCred.user;
            } catch (createErr) {
              // Si déjà créé mais mauvais mot de passe
              throw firebaseErr;
            }
          } else {
            throw firebaseErr;
          }
        }

        if (credUser) {
          let profile = await getDoctorById(credUser.uid) || await getDoctorById(cleanEmail);
          if (!profile && cleanEmail === ADMIN_EMAIL) {
            profile = defaultAdminProfile;
            await createDoctorProfile(profile).catch(() => {});
          }

          const currentUser = { uid: credUser.uid, email: cleanEmail, displayName: profile?.fullName || 'Dr. Elhadji Pathé THIAM' };
          setUser(currentUser);
          setDoctorProfile(profile || (cleanEmail === ADMIN_EMAIL ? defaultAdminProfile : null));
          if (typeof window !== 'undefined') {
            localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: profile || defaultAdminProfile }));
          }
          setLoading(false);
          return profile || defaultAdminProfile;
        }
      }

      // Fallback local
      const doctors = getLocalDoctors();
      let matched = doctors.find(d => d.email.toLowerCase() === cleanEmail);
      if (!matched && cleanEmail === ADMIN_EMAIL) {
        matched = defaultAdminProfile;
      }

      const currentUser = {
        uid: matched?.id || (cleanEmail === ADMIN_EMAIL ? 'admin-thiam-1' : `user-${Date.now()}`),
        email: matched?.email || cleanEmail,
        displayName: matched?.fullName || (cleanEmail === ADMIN_EMAIL ? 'Dr. Elhadji Pathé THIAM' : 'Docteur'),
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
