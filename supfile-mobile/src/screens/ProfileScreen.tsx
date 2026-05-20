import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

  return (
    <Screen>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: "800", marginBottom: 12 }}>
        Profil
      </Text>
      <Panel style={{ gap: 10 }}>
        <View>
          <Text style={{ color: c.textSecondary }}>Email</Text>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>
            {user?.email || "-"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={{ backgroundColor: "#e53e3e", padding: 12, borderRadius: 10, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Déconnexion</Text>
        </TouchableOpacity>
      </Panel>
    </Screen>
  );
}