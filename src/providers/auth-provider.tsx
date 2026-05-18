"use client";

import React, { createContext, useEffect, useState, useCallback, useRef } from "react";
import { Staff } from "@/types/staff";

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
  const [state, setState] = useState<Omit<AuthContextType, "refreshAuth">>({
    staff: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    isSuperAdmin: false,
    isManager: false,
    canDelete: false,
  });

  const inFlight = useRef(false);
  const pendingRefresh = useRef(false);

  const checkAuth = useCallback(async () => {
    if (inFlight.current) {
      pendingRefresh.current = true;
      return;
    }
    inFlight.current = true;
    pendingRefresh.current = false;

    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (data.authenticated && data.staff) {
        const s = data.staff;
        const isAdmin =
          s.isAdmin || s.role === "SUPERADMIN" || s.role === "ADMIN" || false;
        const isSuperAdmin = s.role === "SUPERADMIN";
        const isManager =
          isAdmin || s.department === "ASM" || s.department === "CM";

        setState({
          staff: s,
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
    } finally {
      inFlight.current = false;
      if (pendingRefresh.current) {
        pendingRefresh.current = false;
        checkAuth();
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth-refresh" || e.key === null) {
        checkAuth();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkAuth]);

  useEffect(() => {
    const handleAuthRefresh = () => checkAuth();
    window.addEventListener("auth-refresh", handleAuthRefresh);
    return () => window.removeEventListener("auth-refresh", handleAuthRefresh);
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
