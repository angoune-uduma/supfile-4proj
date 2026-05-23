import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./secureStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
<<<<<<< Updated upstream
if (!API_URL) throw new Error("EXPO_PUBLIC_API_URL is not defined in .env");
=======

if (!API_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL est manquante. Vérifie le fichier .env du projet mobile."
  );
}
>>>>>>> Stashed changes

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

// ─── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ─── 401 / Refresh interceptor ───────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

// Callback appelé si le refresh échoue → déclenche la déconnexion dans AuthContext
let _onLogout: (() => void) | null = null;
export function setLogoutCallback(fn: () => void) {
  _onLogout = fn;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Pas un 401, ou déjà une tentative de retry → on rejette directement
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Si un refresh est déjà en cours, on met la requête en queue
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { headers: { "ngrok-skip-browser-warning": "true" } }
      );

      const { accessToken, refreshToken: newRefreshToken } = data;
      await setTokens(accessToken, newRefreshToken ?? refreshToken);

      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      processQueue(null, accessToken);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();
      _onLogout?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);