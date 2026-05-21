import React from "react";
import { Text, TouchableOpacity, View, ScrollView } from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";
import { useAuth } from "../store/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);
  const c = theme.colors;

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || "??";
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
        
        {/* Header */}
        <Text style={{ color: c.text, fontSize: 32, fontWeight: "900" }}>Profil</Text>
        <Text style={{ color: c.textSecondary }}>Gérez vos informations personnelles.</Text>

        {/* Avatar + infos */}
        <Panel style={{ padding: 20, alignItems: "center", gap: 12 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: c.primary,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900" }}>
              {getInitials(user?.email || "")}
            </Text>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: "900" }}>
              {user?.name || user?.email?.split("@")[0] || "Utilisateur"}
            </Text>
            <Text style={{ color: c.textSecondary, fontSize: 14 }}>
              {user?.email || "-"}
            </Text>
          </View>
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
            <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "700" }}>NOM D'UTILISATEUR</Text>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: "600" }}>
              {user?.name || user?.email?.split("@")[0] || "-"}
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

        {/* Quota */}
        <Panel style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>Stockage</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: c.textSecondary, fontWeight: "700" }}>Espace utilisé</Text>
              <Text style={{ color: c.text, fontWeight: "800" }}>
                {user?.usedStorage ? `${(user.usedStorage / (1024 * 1024 * 1024)).toFixed(2)} Go` : "0 Go"} / 30 Go
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