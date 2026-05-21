const palette = {
  dark: {
    bg: "#0F1117",
    surface: "#1A1D27",
    card: "#22263A",
    border: "#2E3248",
    primary: "#6C63FF",
    primaryLight: "#8B85FF",
    text: "#F0F0F5",
    textSecondary: "#8A8FAA",
    tabBar: "#13151F",
    tabInactive: "#4A4E68",
    tabActive: "#6C63FF",
  },
  light: {
    bg: "#F4F5FA",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E2E4EF",
    primary: "#6C63FF",
    primaryLight: "#8B85FF",
    text: "#1A1D27",
    textSecondary: "#6B7080",
    tabBar: "#FFFFFF",
    tabInactive: "#AAADC4",
    tabActive: "#6C63FF",
  },
};

export const spacing = 16;
export const radius = { sm: 8, md: 14, lg: 22 };

export function buildTheme(mode: "dark" | "light") {
  return {
    colors: palette[mode],
    spacing,
    radius,
  };
}

// Default export for backward compat
export const theme = buildTheme("dark");