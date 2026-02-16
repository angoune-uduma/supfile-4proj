import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, Box } from "@mui/material";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { getTheme } from "./theme";

const STORAGE_KEY = "supfile_theme";

function Root() {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background:
            mode === "dark"
              ? "radial-gradient(circle at top left, #111827, #020617 55%)"
              : "radial-gradient(circle at top left, #e2e8f0, #f8fafc 55%)",
        }}
      >
        <BrowserRouter>
          <App
            mode={mode}
            toggleTheme={() => setMode(mode === "dark" ? "light" : "dark")}
          />
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);