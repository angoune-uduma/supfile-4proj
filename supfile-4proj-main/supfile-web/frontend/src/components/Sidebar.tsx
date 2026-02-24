import { Box, Stack, IconButton, Tooltip } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";

import supfileLogo from "../assets/supfile-logo.png";
import { logoutMock } from "../services/mockAuth";

type SidebarProps = {
  mode: "light" | "dark";
  toggleTheme: () => void;
};

const navItems = [
  { label: "Dashboard", icon: <DashboardRoundedIcon />, path: "/dashboard" },
  { label: "Mes fichiers", icon: <FolderRoundedIcon />, path: "/files" },
  { label: "Partagés", icon: <ShareRoundedIcon />, path: "/shared" },
  { label: "Corbeille", icon: <DeleteRoundedIcon />, path: "/trash" },
];

export default function Sidebar({ mode, toggleTheme }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logoutMock();
    navigate("/login", { replace: true });
  };

  return (
    <Box
      sx={{
        width: 88,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "#050814" : theme.palette.background.paper,
        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 2,
      }}
    >
      {/* LOGO */}
      <Box sx={{ mb: 3 }}>
        <Box
          component="img"
          src={supfileLogo}
          alt="SUPFile"
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            objectFit: "contain",
            p: 0.8,
            background: "radial-gradient(circle at 30% 0, #38bdf8, #1d4ed8)",
            filter: "drop-shadow(0 0 18px rgba(59,130,246,0.75))",
            cursor: "pointer",
          }}
          onClick={() => navigate("/dashboard")}
        />
      </Box>

      {/* NAV */}
      <Stack spacing={1.4} sx={{ flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);

          return (
            <Tooltip title={item.label} placement="right" key={item.label}>
              <IconButton
                onClick={() => navigate(item.path)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  color: active ? "primary.main" : "text.secondary",
                  bgcolor: active ? "rgba(59,130,246,0.15)" : "transparent",
                  border: active
                    ? "1px solid rgba(59,130,246,0.6)"
                    : "1px solid transparent",
                  boxShadow: active
                    ? "0 0 0 1px rgba(37,99,235,0.3)"
                    : "none",
                  "&:hover": {
                    bgcolor: "rgba(148,163,184,0.12)",
                    borderColor: "rgba(148,163,184,0.35)",
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>

      {/* FOOTER */}
      <Stack spacing={1.4}>
        <Tooltip title="Paramètres" placement="right">
          <IconButton
            onClick={() => navigate("/settings")}
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              color: "text.secondary",
              border: "1px solid rgba(148,163,184,0.35)",
              bgcolor: "rgba(148,163,184,0.10)",
              "&:hover": { bgcolor: "rgba(148,163,184,0.14)" },
            }}
          >
            <SettingsRoundedIcon />
          </IconButton>
        </Tooltip>

        <Tooltip
          title={mode === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          placement="right"
        >
          <IconButton
            onClick={toggleTheme}
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              border: "1px solid rgba(148,163,184,0.35)",
              bgcolor: "rgba(148,163,184,0.10)",
              "&:hover": { bgcolor: "rgba(148,163,184,0.14)" },
              color:
                mode === "dark"
                  ? "rgba(147,197,253,0.95)"
                  : "rgba(30,41,59,0.75)",
            }}
          >
            {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Déconnexion" placement="right">
          <IconButton
            onClick={handleLogout}
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.5)",
              "&:hover": { bgcolor: "rgba(248,113,113,0.16)" },
            }}
          >
            <LogoutRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}