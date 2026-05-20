import React from "react";
import { Pressable, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeMode } from "../theme/ThemeContext";
import { buildTheme } from "../theme/theme";

import DashboardScreen from "../screens/DashboardScreen";
import FilesScreen from "../screens/FilesScreen";
import SharedScreen from "../screens/SharedScreen";
import TrashScreen from "../screens/TrashScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Écran vide utilisé comme placeholder pour le bouton toggle
function EmptyScreen() {
  return <View style={{ flex: 1 }} />;
}

const TAB_ICONS: Record<string, [string, string]> = {
  Dashboard: ["grid",    "grid-outline"],
  Files:     ["folder",  "folder-outline"],
  Shared:    ["people",  "people-outline"],
  Trash:     ["trash",   "trash-outline"],
  Profile:   ["person",  "person-outline"],
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { mode, isDark, toggleTheme } = useThemeMode();
  const theme = buildTheme(mode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.bottom,
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? "dark" : "light"}
            intensity={80}
            style={{ flex: 1, backgroundColor: theme.colors.tabBar + "CC" }}
          />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          const [filled, outline] = TAB_ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
          return (
            <Ionicons name={(focused ? filled : outline) as any} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Files"     component={FilesScreen} />
      <Tab.Screen name="Shared"    component={SharedScreen} />
      <Tab.Screen name="Trash"     component={TrashScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
      <Tab.Screen
        name="Theme"
        component={EmptyScreen}
        options={{
          tabBarLabel: isDark ? "Thème" : "Thème",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={size}
              color={color}
            />
          ),
          tabBarButton: (props) => (
            <Pressable
              {...(props as any)}
              onPress={toggleTheme}
              style={props.style}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { mode } = useThemeMode();
  const theme = buildTheme(mode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}