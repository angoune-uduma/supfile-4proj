import axios from "axios";
import { getAccessToken } from "./secureStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.3:4000";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    "ngrok-skip-browser-warning": "true"
  }
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});