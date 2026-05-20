import React, { useMemo, useState } from "react";
import {
  Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, Text, TextInput, View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import Screen from "../../components/Screen";
import Panel from "../../components/Panel";
import { useThemeMode } from "../../theme/ThemeContext";
import { buildTheme } from "../../theme/theme";
import { useAuth } from "../../store/AuthContext";
import { setTokens } from "../../services/secureStore";
import { api } from "../../services/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithGoogle, refreshMe } = useAuth();
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);
  const c = theme.colors;

  const inputStyle = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14 as const,
    paddingVertical: 12 as const,
    borderRadius: 14 as const,
    color: c.text,
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "supfile" });
  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri,
  });

  React.useEffect(() => {
    if (googleResponse?.type === "success") {
      const token =
        (googleResponse.authentication as any)?.accessToken ??
        (googleResponse as any)?.params?.access_token;
      if (token) handleGoogleLogin(token);
    }
  }, [googleResponse]);

  async function handleGoogleLogin(googleAccessToken: string) {
    setError(null); setLoading(true);
    try { await loginWithGoogle(googleAccessToken); }
    catch (e: any) { setError(e?.response?.data?.error || e?.message || "Erreur Google."); }
    finally { setLoading(false); }
  }

  const githubRedirectUri = AuthSession.makeRedirectUri({
    native: "https://auth.expo.io/@davis_93/supfile-mobile",
  });
  const [githubRequest, githubResponse, githubPromptAsync] = AuthSession.useAuthRequest(
    { clientId: "Ov23liyHr5df5KCPNzfz", scopes: ["user:email"], redirectUri: githubRedirectUri },
    { authorizationEndpoint: "https://github.com/login/oauth/authorize" }
  );

  React.useEffect(() => {
    if (githubResponse?.type === "success") {
      const code = githubResponse.params?.code;
      if (code) handleGithubCode(code);
    }
  }, [githubResponse]);

  async function handleGithubCode(code: string) {
    setLoading(true); setError(null);
    try {
      const res = await api.post("/auth/oauth/github/mobile", { code, redirectUri: githubRedirectUri });
      const { accessToken, refreshToken } = res.data;
      await setTokens(accessToken, refreshToken);
      await refreshMe();
    } catch (e: any) { setError(e?.response?.data?.error || e?.message || "Erreur GitHub."); }
    finally { setLoading(false); }
  }

  async function onSubmit() {
    setError(null); setLoading(true);
    try { await login(email.trim(), password); }
    catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Erreur de connexion.");
    } finally { setLoading(false); }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24, gap: 16 }}>

          <View style={{ alignItems: "center", paddingHorizontal: 18 }}>
            <Image source={require("../../../assets/logo.png")} style={{ width: 110, height: 110, marginBottom: 6 }} resizeMode="contain" />
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <Panel style={{ gap: 12, padding: 16 }}>
              <Text style={{ color: c.text, fontSize: 26, fontWeight: "800" }}>Connexion</Text>

              {error && (
                <View style={{ borderWidth: 1, borderColor: "#e53e3e88", backgroundColor: "#e53e3e18", padding: 10, borderRadius: 10 }}>
                  <Text style={{ color: c.text }}>{error}</Text>
                </View>
              )}

              <View style={{ gap: 10 }}>
                <View>
                  <Text style={{ color: c.textSecondary, marginBottom: 6 }}>Adresse email</Text>
                  <TextInput
                    value={email} onChangeText={setEmail}
                    placeholder="ex: email@supfile.com" placeholderTextColor={c.textSecondary}
                    autoCapitalize="none" keyboardType="email-address" returnKeyType="next"
                    style={inputStyle}
                  />
                </View>

                <View>
                  <Text style={{ color: c.textSecondary, marginBottom: 6 }}>Mot de passe</Text>
                  <TextInput
                    value={password} onChangeText={setPassword}
                    placeholder="••••••••" placeholderTextColor={c.textSecondary}
                    secureTextEntry returnKeyType="go" onSubmitEditing={onSubmit}
                    style={inputStyle}
                  />
                </View>

                <Pressable
                  onPress={onSubmit} disabled={!canSubmit}
                  style={{ marginTop: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: c.primary, opacity: canSubmit ? 1 : 0.55, alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
                  <Text style={{ color: c.textSecondary, fontSize: 12 }}>ou</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
                </View>

                <Pressable
                  onPress={() => googlePromptAsync()} disabled={loading}
                  style={{ paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: "row", justifyContent: "center", gap: 10 }}
                >
                  <Text style={{ fontSize: 18 }}>🇬</Text>
                  <Text style={{ color: c.text, fontWeight: "800", fontSize: 15 }}>Continuer avec Google</Text>
                </Pressable>

                <Pressable
                  onPress={() => githubPromptAsync()} disabled={loading || !githubRequest}
                  style={{ paddingVertical: 14, borderRadius: 16, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: "row", justifyContent: "center", gap: 10 }}
                >
                  <Text style={{ fontSize: 18 }}></Text>
                  <Text style={{ color: c.text, fontWeight: "800", fontSize: 15 }}>Continuer avec GitHub</Text>
                </Pressable>

                <Pressable onPress={() => navigation.navigate("Register")} style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ color: c.primary, fontWeight: "800" }}>Créer un compte</Text>
                </Pressable>
              </View>
            </Panel>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}