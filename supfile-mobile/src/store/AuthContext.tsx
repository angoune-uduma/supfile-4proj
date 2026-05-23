import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setLogoutCallback } from "../services/api";
import { login as loginApi, register as registerApi, logout as logoutApi } from "../services/auth";
import { clearTokens, getAccessToken } from "../services/secureStore";

type User = {
  id?: string;
  email?: string;
  avatarUrl?: string | null;
};

type AuthState = {
  isReady: boolean;
  isAuthed: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const isAuthed = !!user;

  async function refreshMe() {
    const res = await api.get("/user/me");
    setUser(res.data);
  }

  // Enregistre le callback de déconnexion pour l'intercepteur 401
  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (token) await refreshMe();
      } catch {
        await clearTokens();
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    await loginApi(email, password);
    await refreshMe();
  }

  async function register(email: string, password: string) {
    await registerApi(email, password);
    await login(email, password);
  }

  async function logout() {
    await logoutApi();
    setUser(null);
  }

  const value = useMemo<AuthState>(
    () => ({ isReady, isAuthed, user, login, register, logout, refreshMe }),
    [isReady, isAuthed, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}