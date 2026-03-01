import axios from "axios";
import { Platform } from "react-native";
import { getAccessToken } from "./auth";

const DEFAULT_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:8080/api"
    : "http://localhost:8080/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});