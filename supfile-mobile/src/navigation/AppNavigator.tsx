import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrashScreen from "../screens/TrashScreen";
import SharedScreen from "../screens/SharedScreen";

import DashboardScreen from "../screens/DashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FilesScreen from "../screens/FilesScreen";

type AppTabsParamList = {
 Dashboard: undefined;
 Files: undefined;
 Shared: undefined;
 Trash: undefined;
 Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

function GlassTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.tabWrap,
          {
            bottom: Math.max(14, insets.bottom + 10),
          },
        ]}
      >
        <BlurView intensity={35} tint="dark" style={styles.blur}>
          <View style={styles.tabInner}>
            {state.routes.map((route: any, index: number) => {
              const { options } = descriptors[route.key];
              const label = options.tabBarLabel ?? options.title ?? route.name;
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              let iconName = "grid-outline";
              if (route.name === "Dashboard") iconName = isFocused ? "grid" : "grid-outline";
              if (route.name === "Files") iconName = isFocused ? "folder" : "folder-outline";
              if (route.name === "Shared") iconName = isFocused ? "share-social" : "share-social-outline";
              if (route.name === "Profile") iconName = isFocused ? "person" : "person-outline";
              if (route.name === "Trash") iconName = isFocused ? "trash" : "trash-outline";

              return (
                <Pressable key={route.key} onPress={onPress} style={styles.item}>
                  <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
                    <Ionicons
                      name={iconName as any}
                      size={20}
                      color={
                        isFocused
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.55)"
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.label,
                      {
                        color: isFocused
                          ? "rgba(96,165,250,0.95)"
                          : "rgba(255,255,255,0.55)",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Files" component={FilesScreen} />
      <Tab.Screen name="Shared" component={SharedScreen} options={{ title: "Partagés" }} />
      <Tab.Screen name="Trash" component={TrashScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />

    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    borderRadius: 22,
    overflow: "hidden",
  },
  blur: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  tabInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  iconPill: {
    width: 44,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconPillActive: {
    backgroundColor: "rgba(59,130,246,0.22)",
    borderColor: "rgba(59,130,246,0.30)",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});