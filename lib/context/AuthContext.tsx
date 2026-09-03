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
  if (profile.status === 'banned' || profile.status === 'blocked' || profile.status === 'rejected') {
    return profile;
  }
  return {
    ...profile,
    status: 'active',
    licenseExpiresAt: profile.licenseExpiresAt || addDays(new Date(), 90).toISOString(),
  };
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
    const rawProfile = await getDoctorById(doctorProfile?.id || user.uid) || await getDoctorById(user.email);
    const profile = normalizeDoctorStatus(rawProfile);
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
        const normalized = normalizeDoctorStatus(updatedProfile);
        setDoctorProfile(normalized);
        if (typeof window !== 'undefined') {
          localStorage.setItem('telemed_session_v2', JSON.stringify({ user, profile: normalized }));
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
              setDoctorProfile(normalizeDoctorStatus(freshProfile));
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
            const normalized = normalizeDoctorStatus(profile);
            setDoctorProfile(normalized);
            if (typeof window !== 'undefined') {
              localStorage.setItem('telemed_session_v2', JSON.stringify({ user: currentUser, profile: normalized }));
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

  const login = async (email: string, password: string = 'Aminata2025'): Promise<DoctorProfile | null> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Profil Officiel Admin Direction
      const defaultAdminProfile: DoctorProfile = {
        id: 'admin-thiam-1',
        fullName: 'Dr. Elhadji Pathé THIAM',
        email: 'pati.amouf@gmail.com',
        phone: '+221 78 106 92 98',
        nin: '1985031500001',
        speciality: 'Direction Médicale • Pharmacien & Informaticien',
        onmsNumber: 'ONMS-DIR-001',
        clinicName: 'Direction Générale THIAM GLOBAL BUSINESS',
        city: 'Dakar',
        consultationFee: 15000,
        avisMedicalFee: 5000,
        visioConsultationFee: 15000,
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
            } catch (e) {}
          }

          // Synchronisation Firebase Auth
          if (isFirebaseConfigured && auth) {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
              if (cred.user) {
                currentUser.uid = cred.user.uid;
                setUser(currentUser);
              }
            } catch (e: any) {
              try {
                await createUserWithEmailAndPassword(auth, cleanEmail, password);
              } catch (err) {}
            }
          }

          // Synchronisation API Cloud
          if (typeof window !== 'undefined') {
            try {
              await fetch('/api/consultation/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'register_doctor', payload: defaultAdminProfile })
              });
            } catch (e) {}
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
