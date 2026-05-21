import React from "react";
import { View, ViewStyle } from "react-native";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";

export default function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          padding: theme.spacing,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}