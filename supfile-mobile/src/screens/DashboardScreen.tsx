import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import StatCard from "../components/StatCard";
import { theme } from "../theme/theme";

export default function DashboardScreen() {
  // placeholder: brancher API /dashboard plus tard
  const used = "0 Go";
  const free = "30 Go";

  return (
    <Screen>
      <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800", marginBottom: 12 }}>
        Dashboard
      </Text>

      <View style={{ gap: 12 }}>
        <StatCard title="Espace utilisé" value={used} subtitle="Sur 30 Go" />
        <StatCard title="Espace libre" value={free} />
      </View>
    </Screen>
  );
}