import { createTheme } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,

      background: {
        default: mode === "dark" ? "#050816" : "#f5f7fb",
        paper: mode === "dark" ? "#0b1020" : "#ffffff",
      },

      primary: { main: "#4f7cff" },

      text: {
        primary: mode === "dark" ? "#f3f6ff" : "#0b1220",
        secondary:
          mode === "dark"
            ? "rgba(243,246,255,0.65)"
            : "rgba(11,18,32,0.62)",
      },

      divider:
        mode === "dark" ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.12)",
    },

    shape: { borderRadius: 18 },

    typography: {
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
    },

    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border:
              mode === "dark"
                ? "1px solid rgba(148,163,184,0.16)"
                : "1px solid rgba(15,23,42,0.10)",
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 999, textTransform: "none", fontWeight: 600 },
        },
      },
    },
  });