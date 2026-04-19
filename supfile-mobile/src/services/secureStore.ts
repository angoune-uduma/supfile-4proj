import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_KEY = "supfile_access_token";
const REFRESH_KEY = "supfile_refresh_token";

export async function setTokens(access: string, refresh?: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    return;
  }

  await SecureStore.setItemAsync(ACCESS_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function getAccessToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem(ACCESS_KEY);
  }

  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem(REFRESH_KEY);
  }

  return SecureStore.getItemAsync(REFRESH_KEY);
}