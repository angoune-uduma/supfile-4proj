import React, { useMemo, useState } from "react";
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

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, password, loading]);

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

                {/* ACTIONS EN COLONNE (évite tout débordement) */}
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