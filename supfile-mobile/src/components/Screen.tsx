import React from "react";
import { SafeAreaView, ViewStyle } from "react-native";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";

export default function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.bg,
          padding: theme.spacing,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}