import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./secureStore";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.163:4000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

// Injecte le token d'accès dans chaque requête
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Rafraîchit le token automatiquement sur 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        await setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        await clearTokens();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
