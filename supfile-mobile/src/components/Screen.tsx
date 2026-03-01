import React from "react";
import { SafeAreaView, ViewStyle } from "react-native";
import { theme } from "../theme/theme";

export default function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView
      style={[
        { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}