import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RequireAuth from "./components/auth/RequireAuth";

// Placeholders (tu peux remplacer plus tard)
function Placeholder({ title }: { title: string }) {
  return (
    <Box sx={{ color: "rgba(255,255,255,0.75)", p: 2 }}>
      <Box sx={{ fontSize: 22, fontWeight: 800, mb: 1 }}>{title}</Box>
      <Box sx={{ opacity: 0.8 }}>Page en cours de développement.</Box>
    </Box>
  );
}

function AppLayout() {
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
      <Sidebar />
      <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* placeholders pour la navigation */}
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

export default function App() {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  // Au lancement sur "/", on force la page login
  if (location.pathname === "/") {
    return <Navigate to="/login" replace />;
  }

  // Auth screens = plein écran, pas de sidebar
  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // App screens = layout + sidebar, protégés
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}