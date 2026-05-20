import React, { useMemo, useState, useEffect } from "react";
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
import { setTokens } from "../../services/secureStore";
import { api } from "../../services/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
<<<<<<< Updated upstream
  const { login } = useAuth();
=======
  const { login, refreshMe } = useAuth();
>>>>>>> Stashed changes

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

<<<<<<< Updated upstream
  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, password, loading]);
=======
  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  // ---- GOOGLE via proxy Expo ----
  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: AuthSession.makeRedirectUri({ native: "https://auth.expo.io/@davis_93/supfile-mobile" }),
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const token =
        (googleResponse.authentication as any)?.accessToken ??
        (googleResponse as any)?.params?.access_token;
      if (token) handleGoogleToken(token);
    }
  }, [googleResponse]);

  async function handleGoogleToken(googleAccessToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/oauth/google/mobile", {
        accessToken: googleAccessToken,
      });
      const { accessToken, refreshToken } = res.data;
      await setTokens(accessToken, refreshToken);
      await refreshMe();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Erreur Google.");
    } finally {
      setLoading(false);
    }
  }
>>>>>>> Stashed changes

  // ---- GITHUB via proxy Expo ----
  const githubRedirectUri = AuthSession.makeRedirectUri({ native: "https://auth.expo.io/@davis_93/supfile-mobile" });
  const [githubRequest, githubResponse, githubPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "Ov23liyHr5df5KCPNzfz",
      scopes: ["user:email"],
      redirectUri: githubRedirectUri,
    },
    { authorizationEndpoint: "https://github.com/login/oauth/authorize" }
  );

  useEffect(() => {
    if (githubResponse?.type === "success") {
      const code = githubResponse.params?.code;
      if (code) handleGithubCode(code);
    }
  }, [githubResponse]);

  async function handleGithubCode(code: string) {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const res = await api.post("/auth/oauth/github/mobile", { code, redirectUri: githubRedirectUri });
      const { accessToken, refreshToken } = res.data;
      await setTokens(accessToken, refreshToken);
      await refreshMe();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Erreur GitHub.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Erreur de connexion."
      );
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
          {/* LOGO SEUL */}
          <View style={{ alignItems: "center", paddingHorizontal: 18 }}>
            <Image
              source={require("../../../assets/logo.png")}
              style={{ width: 110, height: 110, marginBottom: 6 }}
              resizeMode="contain"
            />
          </View>

          {/* CARD */}
          <View style={{ paddingHorizontal: 16 }}>
            <Panel style={{ gap: 12, padding: 16 }}>
              <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: "800" }}>
                Connexion
              </Text>

              {error && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.35)",
                    backgroundColor: "rgba(239,68,68,0.10)",
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.92)" }}>{error}</Text>
                </View>
              )}

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
                    Adresse email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ex: email@supfile.com"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    autoCapitalize="none"
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
                  <Text style={{ color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
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

<<<<<<< Updated upstream
                {/* ACTIONS EN COLONNE (évite tout débordement) */}
=======
>>>>>>> Stashed changes
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
                  <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900", fontSize: 16 }}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Text>
                </Pressable>

<<<<<<< Updated upstream
=======
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.10)" }} />
                  <Text style={{ color: "rgba(255,255,255,0.40)", fontSize: 12 }}>ou</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.10)" }} />
                </View>

                <Pressable
                  onPress={() => googlePromptAsync()}
                  disabled={loading}
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
                  <Text style={{ fontSize: 18 }}>🇬</Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800", fontSize: 15 }}>
                    Continuer avec Google
                  </Text>
                </Pressable>

>>>>>>> Stashed changes
                <Pressable
                  onPress={() => githubPromptAsync()}
                  disabled={loading || !githubRequest}
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
                  <Text style={{ fontSize: 18 }}>🐙</Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800", fontSize: 15 }}>
                    Continuer avec GitHub
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => navigation.navigate("Register")}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                >
                  <Text style={{ color: "rgba(96,165,250,0.95)", fontWeight: "800" }}>
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