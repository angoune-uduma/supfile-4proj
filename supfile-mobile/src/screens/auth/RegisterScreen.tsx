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
import { register as registerApi } from "../../services/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.length >= 8 &&
      confirm.length >= 8 &&
      password === confirm &&
      !loading
    );
  }, [email, password, confirm, loading]);

  async function onSubmit() {
    setError(null);
    setOk(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await registerApi(email.trim(), password);
      setOk("Compte créé. Tu peux maintenant te connecter.");
      setTimeout(() => navigation.replace("Login"), 700);
    } catch (e: any) {
      const backend = e?.response?.data?.error || e?.response?.data?.message;

      if (backend === "EMAIL_ALREADY_USED") setError("Cet email est déjà utilisé.");
      else if (backend === "VALIDATION_ERROR")
        setError("Veuillez vérifier les champs (email/mot de passe).");
      else setError(backend || "Erreur d'inscription.");
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
              style={{ width: 105, height: 105, marginBottom: 6 }}
              resizeMode="contain"
            />
          </View>

          {/* CARD */}
          <View style={{ paddingHorizontal: 16 }}>
            <Panel style={{ gap: 12, padding: 16 }}>
              <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: "800" }}>
                Inscription
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

              {ok && (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(59,130,246,0.35)",
                    backgroundColor: "rgba(59,130,246,0.10)",
                    padding: 10,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.92)" }}>{ok}</Text>
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
                    placeholder="Minimum 8 caractères"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    secureTextEntry
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
                    Confirmer
                  </Text>
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Retape le mot de passe"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    secureTextEntry
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

                {/* ACTIONS EN COLONNE (fix overflow) */}
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
                    {loading ? "Création..." : "Créer le compte"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => navigation.replace("Login")}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                >
                  <Text style={{ color: "rgba(96,165,250,0.95)", fontWeight: "800" }}>
                    Déjà un compte ? Se connecter
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => navigation.replace("Login")}
                  style={{
                    marginTop: 2,
                    paddingVertical: 12,
                    borderRadius: 16,
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "800" }}>
                    Retour connexion
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