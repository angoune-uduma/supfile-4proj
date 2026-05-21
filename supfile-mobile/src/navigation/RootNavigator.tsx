import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import { useAuth } from "../store/AuthContext";
import { ThemeProvider, useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";

function Navigation() {
  const { isReady, isAuthed } = useAuth();
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthed ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <ThemeProvider>
      <Navigation />
    </ThemeProvider>
  );
}