import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RequireAuth from "./components/auth/RequireAuth";

type AppProps = {
  mode: "light" | "dark";
  toggleTheme: () => void;
};

// (Optionnel) placeholders pour éviter écran vide quand tu cliques
function Placeholder({ title }: { title: string }) {
  return (
    <Box sx={{ color: "text.primary", p: 2 }}>
      <Box sx={{ fontSize: 22, fontWeight: 800, mb: 1 }}>{title}</Box>
      <Box sx={{ color: "text.secondary" }}>Page en cours de développement.</Box>
    </Box>
  );
}

function AppLayout({ mode, toggleTheme }: AppProps) {
  return (
    <Box
      sx={{
        display: "flex",
        maxWidth: 1440,
        mx: "auto",
        width: "100%",
        minHeight: "100vh",
      }}
    >
      <Sidebar mode={mode} toggleTheme={toggleTheme} />

      <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* placeholders */}
          <Route path="/files" element={<Placeholder title="Mes fichiers" />} />
          <Route path="/shared" element={<Placeholder title="Partagés" />} />
          <Route path="/trash" element={<Placeholder title="Corbeille" />} />
          <Route path="/settings" element={<Placeholder title="Paramètres" />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App({ mode, toggleTheme }: AppProps) {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  // au lancement sur "/", on force /login
  if (location.pathname === "/") {
    return <Navigate to="/login" replace />;
  }

  // écrans auth (plein écran)
  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // écrans app protégés
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout mode={mode} toggleTheme={toggleTheme} />
          </RequireAuth>
        }
      />
    </Routes>
  );
}