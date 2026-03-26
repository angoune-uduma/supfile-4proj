import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import { useAuth } from "../store/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { theme } from "../theme/theme";

export default function RootNavigator() {
  const { isReady, isAuthed } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthed ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}