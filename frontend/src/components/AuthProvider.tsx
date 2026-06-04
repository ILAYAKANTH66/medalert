"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/auth.service';
import type { UserProfile } from '@/lib/types';
import { ApiError } from '@/lib/api';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (token: string, userDetails: UserProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/signup'];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const loadProfile = useCallback(async (authToken: string) => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
      setToken(authToken);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Auth] Profile loaded:', profile.email, 'role:', profile.role);
      }
    } catch (error) {
      console.error('[Auth] Failed to load profile, token may be invalid:', error);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token')?.replace(/^"|"$/g, '').trim();
    if (storedToken) {
      loadProfile(storedToken);
    } else {
      setLoading(false);
    }

    const handleAuthExpired = () => {
      clearSession();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [loadProfile, clearSession]);

  useEffect(() => {
    if (!loading && !user && !isPublicPath(pathname)) {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  const login = (newToken: string, userDetails: UserProfile) => {
    const trimmed = newToken.trim();
    localStorage.setItem('token', trimmed);
    setToken(trimmed);
    setUser(userDetails);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Auth] Login success:', userDetails.email, 'role:', userDetails.role);
    }
    router.push('/dashboard');
  };

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  const refreshUser = async () => {
    const activeToken = localStorage.getItem('token')?.replace(/^"|"$/g, '').trim();
    if (activeToken) {
      await loadProfile(activeToken);
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!token && !!user,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
