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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function hydrateUser() {
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
      return { ok: true, message: payload.message ?? "Login successful." };
    } catch {
      return { ok: false, message: "The database could not be reached. Please try again." };
    }
  };

  const logout = () => setUser(null);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const response = await fetch("/api/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "changePassword", userId: user?.uid, data: { currentPassword, newPassword } }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) return { ok: false, message: payload.error ?? "Password could not be changed." };
    if (user) setUser({ ...user, password: newPassword, mustChangePassword: false });
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
