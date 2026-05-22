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

export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await api.patch("/user/me/password", { oldPassword, newPassword });
  return res.data;
}

export async function uploadAvatar(uri: string, mimeType: string, filename: string) {
  const formData = new FormData();
  formData.append("avatar", {
    uri,
    type: mimeType,
    name: filename,
  } as any);

  const res = await api.patch("/user/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}