import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, Box } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { theme } from "./theme";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, #111827, #020617 55%)",
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Box>
    </ThemeProvider>
  </React.StrictMode>
);