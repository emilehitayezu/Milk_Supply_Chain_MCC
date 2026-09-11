"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUser } from "@/lib/app-data";

type AuthContextValue = {
  user: AppUser | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_STORAGE_KEY = "milk-auth-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function hydrateUser() {
      const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as AppUser);
        } catch {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setIsReady(true);
    }

    void hydrateUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string; user?: AppUser | null };

      if (!payload.ok || !payload.user) {
        return { ok: false, message: payload.message ?? "Invalid email or password." };
      }

      setUser(payload.user);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload.user));
      return { ok: true, message: payload.message ?? "Login successful." };
    } catch {
      return { ok: false, message: "The database could not be reached. Please try again." };
    }
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch("/api/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "changePassword", userId: user?.uid, data: { currentPassword, newPassword } }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) return { ok: false, message: payload.error ?? "Password could not be changed." };
    if (user) {
      const updatedUser = { ...user, password: newPassword, mustChangePassword: false };
      setUser(updatedUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }
    return { ok: true, message: "Password changed successfully." };
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      login,
      logout,
      changePassword,
    }),
    [isReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
