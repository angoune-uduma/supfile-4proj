import React, { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
import { useAuth } from "../store/AuthContext";
import { api } from "../services/api";

export default function ProfileScreen() {
  const { user, logout, refreshMe } = useAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveProfile() {
    try {
      setLoading(true);

      await api.patch("/user/me", {
        email,
        avatarUrl: avatarUrl || null,
      });

      await refreshMe();
      Alert.alert("Succès", "Profil mis à jour.");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.error || "Impossible de mettre à jour le profil.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    try {
      setLoading(true);

      await api.patch("/user/me/password", {
        oldPassword,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      Alert.alert("Succès", "Mot de passe modifié.");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.error || "Impossible de changer le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800", marginBottom: 12 }}>
          Profil
        </Text>

        <Panel style={{ gap: 12, marginBottom: 16 }}>
          <View>
            <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{
                backgroundColor: "#111827",
                color: "white",
                borderRadius: 10,
                padding: 12,
              }}
            />
          </View>

          <View>
            <Text style={{ color: theme.colors.muted, marginBottom: 6 }}>Avatar URL</Text>
            <TextInput
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              autoCapitalize="none"
              style={{
                backgroundColor: "#111827",
                color: "white",
                borderRadius: 10,
                padding: 12,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={saveProfile}
            disabled={loading}
            style={{
              backgroundColor: theme.colors.primary,
              padding: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800" }}>Enregistrer le profil</Text>
          </TouchableOpacity>
        </Panel>

        <Panel style={{ gap: 12, marginBottom: 16 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
            Changer le mot de passe
          </Text>

          <TextInput
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            placeholder="Ancien mot de passe"
            placeholderTextColor="#94a3b8"
            style={{
              backgroundColor: "#111827",
              color: "white",
              borderRadius: 10,
              padding: 12,
            }}
          />

          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Nouveau mot de passe"
            placeholderTextColor="#94a3b8"
            style={{
              backgroundColor: "#111827",
              color: "white",
              borderRadius: 10,
              padding: 12,
            }}
          />

          <TouchableOpacity
            onPress={changePassword}
            disabled={loading}
            style={{
              backgroundColor: "#f59e0b",
              padding: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800" }}>Changer le mot de passe</Text>
          </TouchableOpacity>
        </Panel>

        <Panel>
          <TouchableOpacity
            onPress={logout}
            style={{
              backgroundColor: theme.colors.danger,
              padding: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "800" }}>Déconnexion</Text>
          </TouchableOpacity>
        </Panel>
      </ScrollView>
    </Screen>
  );
}