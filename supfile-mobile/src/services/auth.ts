import { api } from "./api";
import { setTokens, clearTokens } from "./secureStore";

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });

  const { accessToken, refreshToken } = res.data || {};

  if (!accessToken || !refreshToken) {
    throw new Error("Tokens manquants dans la réponse du serveur.");
  }

  await setTokens(accessToken, refreshToken);
  return res.data;
}

export async function register(email: string, password: string) {
  const res = await api.post("/auth/register", { email, password });
  return res.data;
}

export async function logout() {
  await clearTokens();
}