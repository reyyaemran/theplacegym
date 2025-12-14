"use client";

import React, { createContext, useEffect, useState, useCallback } from "react";
import { Staff, StaffPermission } from "@/types/staff";

interface AuthContextType {
  staff: Staff | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  canDelete: boolean;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  staff: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  isManager: false,
  canDelete: false,
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthContextType, 'refreshAuth'>>({
    staff: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    isSuperAdmin: false,
    isManager: false,
    canDelete: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (data.authenticated && data.staff) {
        const staff = data.staff;
        const isAdmin = staff.isAdmin || staff.role === "SUPERADMIN" || staff.role === "ADMIN" || false;
        const isSuperAdmin = staff.role === "SUPERADMIN";
        
        // Managers include ASM, CM, and Admins
        const isManager = 
          isAdmin || 
          staff.department === "ASM" || 
          staff.department === "CM";

        setState({
          staff,
          isLoading: false,
          isAuthenticated: true,
          isAdmin,
          isSuperAdmin,
          isManager,
          canDelete: isManager,
        });
      } else {
        setState({
          staff: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          isSuperAdmin: false,
          isManager: false,
          canDelete: false,
        });
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setState({
        staff: null,
        isLoading: false,
        isAuthenticated: false,
        isAdmin: false,
        isSuperAdmin: false,
        isManager: false,
        canDelete: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for storage events (triggered by other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-refresh' || e.key === null) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth]);

  // Listen for custom auth refresh events
  useEffect(() => {
    const handleAuthRefresh = () => {
      checkAuth();
    };

    window.addEventListener('auth-refresh', handleAuthRefresh);
    return () => window.removeEventListener('auth-refresh', handleAuthRefresh);
  }, [checkAuth]);

  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ ...state, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

