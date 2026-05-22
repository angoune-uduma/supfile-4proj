import React, { useMemo, useState } from "react";
import * as AuthSession from "expo-auth-session";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import Panel from "../../components/Panel";
import { theme } from "../../theme/theme";
import { useAuth } from "../../store/AuthContext";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";

import { api } from "../../services/api";
import { setTokens } from "../../services/secureStore";
WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

function getFriendlyError(error: string) {
  if (error === "INVALID_CREDENTIALS") {
    return "Email ou mot de passe incorrect.";
  }

  if (error === "EMAIL_AND_PASSWORD_REQUIRED") {
    return "Veuillez renseigner l’email et le mot de passe.";
  }

  if (error === "Network Error" || error === "NETWORK_ERROR") {
    return "Impossible de contacter le serveur. Vérifie que le backend est lancé et que EXPO_PUBLIC_API_URL est correcte.";
  }
  if (error === "MISSING_CODE") {
    return "Code GitHub manquant.";
  }

  if (error === "GITHUB_TOKEN_ERROR") {
    return "Impossible de récupérer le token GitHub.";
  }

  if (error === "NO_EMAIL_FROM_GITHUB") {
    return "GitHub n’a pas retourné d’email.";
  }

  return error || "Erreur de connexion.";
}

export default function LoginScreen({ navigation }: Props) {
  const { login,refreshMe } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
  });
  const githubRedirectUri = AuthSession.makeRedirectUri();

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      redirectUri,
    });
  const [githubRequest, githubResponse, githubPromptAsync] =
    AuthSession.useAuthRequest(
      {
        clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || "",
        scopes: ["user:email"],
        redirectUri: githubRedirectUri,
      },
      {
        authorizationEndpoint: "https://github.com/login/oauth/authorize",
      }
    );

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const accessToken =
        googleResponse.authentication?.accessToken;

      if (accessToken) {
        handleGoogleLogin(accessToken);
      }
    }
  }, [googleResponse]);

  useEffect(() => {
    if (githubResponse?.type === "success") {
      const code = githubResponse.params?.code;

      if (code) {
        handleGithubLogin(code);
      }
    }
  }, [githubResponse]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, password, loading]);


  async function handleGoogleLogin(
    googleAccessToken: string
  ) {
    try {
      setError(null);
      setLoading(true);

      const res = await api.post(
        "/auth/oauth/google/mobile",
        {
          accessToken: googleAccessToken,
        }
      );

      const { accessToken, refreshToken } = res.data;

      await setTokens(accessToken, refreshToken);

      await refreshMe();
    } catch (e: any) {
      const backendError =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Erreur Google.";

      setError(getFriendlyError(backendError));
    } finally {
      setLoading(false);
    }
  }
  async function handleGithubLogin(code: string) {
    try {
      setError(null);
      setLoading(true);

      const res = await api.post("/auth/oauth/github/mobile", {
        code,
        redirectUri: githubRedirectUri,
      });

      const { accessToken, refreshToken } = res.data;

      await setTokens(accessToken, refreshToken);
      await refreshMe();
    } catch (e: any) {
      const backendError =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Erreur GitHub.";

      setError(getFriendlyError(backendError));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      const backendError =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Erreur de connexion.";

      setError(getFriendlyError(backendError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 24,
            gap: 16,
          }}
        >
          <View style={{ alignItems: "center", paddingHorizontal: 18 }}>
            <Image
              source={require("../../../assets/logo.png")}
              style={{ width: 110, height: 110, marginBottom: 6 }}
              resizeMode="contain"
            />
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <Panel style={{ gap: 12, padding: 16 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 26,
                  fontWeight: "800",
                }}
              >
                Connexion
              </Text>

              {error ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.35)",
                    backgroundColor: "rgba(239,68,68,0.10)",
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.92)" }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: 10 }}>
                <View>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      marginBottom: 6,
                    }}
                  >
                    Adresse email
                  </Text>

                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ex: email@supfile.com"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 14,
                      color: theme.colors.text,
                    }}
                  />
                </View>

                <View>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      marginBottom: 6,
                    }}
                  >
                    Mot de passe
                  </Text>

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    secureTextEntry
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 14,
                      color: theme.colors.text,
                    }}
                  />
                </View>

                <Pressable
                  onPress={onSubmit}
                  disabled={!canSubmit}
                  style={{
                    marginTop: 6,
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: "rgba(96,165,250,0.95)",
                    opacity: canSubmit ? 1 : 0.55,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(0,0,0,0.85)",
                      fontWeight: "900",
                      fontSize: 16,
                    }}
                  >
                    {loading ? "Connexion..." : "Se connecter"}
                  </Text>
                </Pressable>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  />

                  <Text
                    style={{
                      color: "rgba(255,255,255,0.40)",
                      fontSize: 12,
                    }}
                  >
                    ou
                  </Text>

                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  />
                </View>

                <Pressable
                  onPress={() => googlePromptAsync({ useProxy: true })}
                  disabled={!googleRequest || loading}
                  style={{
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Image
                    source={require("../../../assets/google.png")}
                    style={{ width: 24, height: 24 }}
                    resizeMode="contain"
                  />

                  <Text
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    Continuer avec Google
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => githubPromptAsync()}
                  disabled={!githubRequest || loading}
                  style={{
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <Image
                    source={require("../../../assets/github.png")}
                    style={{ width: 24, height: 24 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    Continuer avec GitHub
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate("Register")}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                >
                  <Text
                    style={{
                      color: "rgba(96,165,250,0.95)",
                      fontWeight: "800",
                    }}
                  >
                    Créer un compte
                  </Text>
                </Pressable>
              </View>
            </Panel>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}