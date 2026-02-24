import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

import AuthSuccess from "./pages/auth/AuthSuccess";

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
  return (
    <Routes>
      {/* redirection racine */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* routes publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* IMPORTANT : oauth success doit être PUBLIC */}
      <Route path="/oauth/success" element={<AuthSuccess />} />

      {/* routes protégées (toute l'app) */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout mode={mode} toggleTheme={toggleTheme} />
          </RequireAuth>
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}