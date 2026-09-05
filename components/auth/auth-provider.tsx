"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readAppState, type AppUser } from "@/lib/app-data";

const STORAGE_KEY = "milk-demo-user";

type AuthContextValue = {
  user: AppUser | null;
  login: (email: string, password: string) => { ok: boolean; message: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedUser = window.localStorage.getItem(STORAGE_KEY);

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as { uid: string };
      const state = readAppState();
      const matchedUser = state.users.find((candidate) => candidate.uid === parsedUser.uid) ?? null;
      setUser(matchedUser);
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }

    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid: user.uid, email: user.email }));
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, [isReady, user]);

  const login = (email: string, password: string) => {
    const state = readAppState();
    const matchedUser = state.users.find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password,
    );

    if (!matchedUser) {
      return { ok: false, message: "Invalid email or password." };
    }

    setUser(matchedUser);
    return { ok: true, message: "Login successful." };
  };

  const logout = () => setUser(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login,
      logout,
    }),
    [user],
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
