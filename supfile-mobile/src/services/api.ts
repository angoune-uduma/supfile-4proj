import axios from "axios";
import { getAccessToken } from "./secureStore"; // <-- IMPORTANT

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://192.168.1.163:4000"; // <-- ton IP Mac

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});