import React, { useState } from "react";
import {
  Text, TouchableOpacity, View, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";
import { useAuth } from "../store/AuthContext";
import { changePassword, uploadAvatar } from "../services/auth";

export default function ProfileScreen() {
  const { user, logout, refreshMe } = useAuth();
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);
  const c = theme.colors;

  // Changement de mot de passe
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingPwd, setLoadingPwd] = useState(false);

  // Avatar
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || "??";
  };

  async function onPickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie pour changer ton avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const filename = asset.uri.split("/").pop() || "avatar.jpg";
    const mimeType = asset.mimeType || "image/jpeg";

    setLoadingAvatar(true);
    try {
      await uploadAvatar(asset.uri, mimeType, filename);
      await refreshMe();
      Alert.alert("Succès", "Avatar mis à jour ✅");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.error || "Erreur upload avatar.");
    } finally {
      setLoadingAvatar(false);
    }
  }

  async function onChangePassword() {
    if (!oldPassword.trim()) {
      Alert.alert("Erreur", "L'ancien mot de passe est obligatoire.");
      return;
    }
    if (newPassword.trim().length < 8) {
      Alert.alert("Erreur", "Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoadingPwd(true);
    try {
      await changePassword(oldPassword, newPassword);
      Alert.alert("Succès", "Mot de passe mis à jour ✅");
      setOldPassword("");
      setNewPassword("");
    } catch (e: any) {
      const err = e?.response?.data?.error;
      if (err === "INVALID_OLD_PASSWORD") {
        Alert.alert("Erreur", "L'ancien mot de passe est incorrect.");
      } else if (err === "OAUTH_ACCOUNT_NO_PASSWORD") {
        Alert.alert("Erreur", "Ce compte ne possède pas de mot de passe local.");
      } else {
        Alert.alert("Erreur", err || "Erreur serveur.");
      }
    } finally {
      setLoadingPwd(false);
    }
  }

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    color: c.text,
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
      >
        {/* Header */}
        <Text style={{ color: c.text, fontSize: 32, fontWeight: "900" }}>Profil</Text>
        <Text style={{ color: c.textSecondary }}>Gérez vos informations personnelles.</Text>

        {/* Avatar + infos */}
        <Panel style={{ padding: 20, alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={onPickAvatar} disabled={loadingAvatar}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: c.primary,
              alignItems: "center", justifyContent: "center",
            }}>
              {loadingAvatar ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>
                  {getInitials(user?.email || "")}
                </Text>
              )}
            </View>
            <View style={{
              position: "absolute", bottom: 0, right: 0,
              backgroundColor: c.primary, borderRadius: 10,
              width: 22, height: 22, alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#fff", fontSize: 12 }}>✏️</Text>
            </View>
          </TouchableOpacity>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: "900" }}>
              {user?.email?.split("@")[0] || "Utilisateur"}
            </Text>
            <Text style={{ color: c.textSecondary, fontSize: 14 }}>
              {user?.email || "-"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onPickAvatar}
            style={{
              backgroundColor: "rgba(96,165,250,0.15)",
              borderWidth: 1,
              borderColor: "rgba(96,165,250,0.4)",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#60a5fa", fontWeight: "700" }}>
              {loadingAvatar ? "Chargement..." : "Changer l'avatar"}
            </Text>
          </TouchableOpacity>
        </Panel>

        {/* Informations */}
        <Panel style={{ padding: 16, gap: 16 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>Informations</Text>

          <View style={{ gap: 4 }}>
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "700" }}>EMAIL</Text>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "600" }}>
              {user?.email || "-"}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: c.border }} />

          <View style={{ gap: 4 }}>
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "700" }}>COMPTE</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
              <Text style={{ color: "#22c55e", fontSize: 14, fontWeight: "700" }}>Actif</Text>
            </View>
          </View>
        </Panel>

        {/* Changement de mot de passe */}
        <Panel style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>Sécurité</Text>

          <View style={{ gap: 6 }}>
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "700" }}>
              ANCIEN MOT DE PASSE
            </Text>
            <TextInput
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry
              style={inputStyle}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "700" }}>
              NOUVEAU MOT DE PASSE
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 8 caractères"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry
              style={inputStyle}
            />
          </View>

          <TouchableOpacity
            onPress={onChangePassword}
            disabled={loadingPwd}
            style={{
              backgroundColor: "rgba(96,165,250,0.95)",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              opacity: loadingPwd ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "rgba(0,0,0,0.85)", fontWeight: "900", fontSize: 16 }}>
              {loadingPwd ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </Text>
          </TouchableOpacity>
        </Panel>

        {/* Quota */}
        <Panel style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>Stockage</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: c.textSecondary, fontWeight: "700" }}>Espace utilisé</Text>
              <Text style={{ color: c.text, fontWeight: "800" }}>
                {user?.usedStorage
                  ? `${(user.usedStorage / (1024 * 1024 * 1024)).toFixed(2)} Go`
                  : "0 Go"} / 30 Go
              </Text>
            </View>
            <View style={{ height: 10, borderRadius: 999, backgroundColor: c.border, overflow: "hidden" }}>
              <View style={{
                height: "100%",
                width: `${Math.min(((user?.usedStorage || 0) / (30 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                backgroundColor: c.primary,
                borderRadius: 999,
              }} />
            </View>
          </View>
        </Panel>

        {/* Déconnexion */}
        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: "#e53e3e22",
            borderWidth: 1,
            borderColor: "#e53e3e",
            padding: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#e53e3e", fontWeight: "900", fontSize: 16 }}>Déconnexion</Text>
        </TouchableOpacity>

      </ScrollView>
    </Screen>
  );
}