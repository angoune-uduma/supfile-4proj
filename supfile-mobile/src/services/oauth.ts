import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { setTokens } from "./secureStore";

WebBrowser.maybeCompleteAuthSession();

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.163:4000";

export async function loginWithGithubMobile() {
  const redirectUri = Linking.createURL("oauth/callback");

  const authUrl =
    `${API_URL}/auth/oauth/github/mobile/start` +
    `?redirect_uri=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success") {
    throw new Error("Connexion GitHub annulée.");
  }

  const url = new URL(result.url);
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");

  if (!accessToken || !refreshToken) {
    throw new Error("Tokens OAuth manquants.");
  }

  await setTokens(accessToken, refreshToken);
}
