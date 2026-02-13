import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#050816",
      paper: "#0b1020",
    },
    primary: { main: "#4f7cff" },
    text: {
      primary: "#f3f6ff",
      secondary: "rgba(243,246,255,0.65)",
    },
    divider: "rgba(148,163,184,0.18)",
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
          border: "1px solid rgba(148,163,184,0.16)",
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
