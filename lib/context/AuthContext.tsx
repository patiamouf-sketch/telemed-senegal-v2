'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DoctorProfile } from '../types/doctor';
import { auth, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getDoctorById, createDoctorProfile } from '../services/doctorService';
import { INITIAL_DOCTORS, getLocalDoctors } from '../services/mockData';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'dr.thiam@telemed.sn').toLowerCase();

interface AuthContextType {
  user: { uid: string; email: string; displayName?: string } | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password?: string) => Promise<DoctorProfile | null>;
  signup: (data: Omit<DoctorProfile, 'id' | 'status' | 'createdAt'>, password?: string) => Promise<DoctorProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchDemoUser: (role: 'admin' | 'pending' | 'active' | 'anonymous') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ uid: string; email: string; displayName?: string } | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = Boolean(
    user?.email?.toLowerCase() === ADMIN_EMAIL || 
    doctorProfile?.email?.toLowerCase() === ADMIN_EMAIL ||
    doctorProfile?.id === 'admin-thiam-1'
  );

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setDoctorProfile(null);
      return;
    }
    const profile = await getDoctorById(user.uid) || await getDoctorById(user.email);
    if (profile) {
      setDoctorProfile(profile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('telemed_session_v2', JSON.stringify({ user, profile }));
      }
    }
  }, [user]);

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

      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const profile = await getDoctorById(cred.user.uid) || await getDoctorById(cleanEmail);
        setUser({ uid: cred.user.uid, email: cleanEmail });
        setDoctorProfile(profile);
        setLoading(false);
        return profile;
      }

      // Local / Demo mode fallback
      const doctors = getLocalDoctors();
      let matched = doctors.find(d => d.email.toLowerCase() === cleanEmail);
      
      // Auto-create or match demo profile if not found
      if (!matched && cleanEmail === ADMIN_EMAIL) {
        matched = INITIAL_DOCTORS.find(d => d.id === 'admin-thiam-1');
      }

      if (!matched) {
        // Find by simple name or fallback
        matched = doctors[0];
      }

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
            console.warn('Firebase signup warning:', e);
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

  const switchDemoUser = (role: 'admin' | 'pending' | 'active' | 'anonymous') => {
    const doctors = getLocalDoctors();
    if (role === 'anonymous') {
      logout();
      return;
    }
    
    let target: DoctorProfile | undefined;
    if (role === 'admin') {
      target = doctors.find(d => d.email.toLowerCase() === ADMIN_EMAIL) || INITIAL_DOCTORS[3];
    } else if (role === 'pending') {
      target = doctors.find(d => d.status === 'pending') || INITIAL_DOCTORS[1];
    } else if (role === 'active') {
      target = doctors.find(d => d.status === 'active' && d.id !== 'admin-thiam-1') || INITIAL_DOCTORS[0];
    }

    if (target) {
      const demoUser = {
        uid: target.id,
        email: target.email,
        displayName: target.fullName,
      };
      setUser(demoUser);
      setDoctorProfile(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('telemed_session_v2', JSON.stringify({ user: demoUser, profile: target }));
      }
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
        switchDemoUser,
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
