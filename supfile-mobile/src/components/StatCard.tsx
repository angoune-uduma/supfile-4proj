import React from "react";
import { Text, View } from "react-native";
import Panel from "./Panel";
import { theme } from "../theme/theme";

export default function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Panel style={{ gap: 6 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{title}</Text>
      <View>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 22,
            fontWeight: "700",
          }}
        >
          {value}
        </Text>
        {!!subtitle && (
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </View>
    </Panel>
  );
}