import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Screen from "../components/Screen";
import Panel from "../components/Panel";
import { theme } from "../theme/theme";
import { useAuth } from "../store/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800", marginBottom: 12 }}>
        Profil
      </Text>

      <Panel style={{ gap: 10 }}>
        <View>
          <Text style={{ color: theme.colors.muted }}>Email</Text>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700" }}>
            {user?.email || "-"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={logout}
          style={{ backgroundColor: theme.colors.danger, padding: 12, borderRadius: 10, alignItems: "center" }}
        >
          <Text style={{ fontWeight: "800" }}>Déconnexion</Text>
        </TouchableOpacity>
      </Panel>
    </Screen>
  );
}