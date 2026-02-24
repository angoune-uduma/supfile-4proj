import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  IconButton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
} from "@mui/material";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import supfileLogo from "../assets/supfile-logo.png";
import { apiFetch, clearTokens } from "../services/api";

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

  const [me, setMe] = useState<{ email: string; avatarUrl?: string | null } | null>(
    null
  );

  // menu profil
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const isActive = (path: string) => location.pathname === path;

  // Fetch profil (email/avatar) pour afficher l'avatar
  useEffect(() => {
    (async () => {
      const { res, data } = await apiFetch("/user/me", { method: "GET" });
      if (res.ok) setMe(data);
      // si 401, on laisse RequireAuth gérer (ou tu peux clearTokens + redirect ici si tu veux)
    })();
  }, []);

  const handleLogout = () => {
    clearTokens();
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
      {/* PROFILE / LOGO BUTTON */}
      <Box sx={{ mb: 3 }}>
        <Tooltip title={me?.email ? `Profil (${me.email})` : "Profil"} placement="right">
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              p: 0,
              borderRadius: "50%",
              width: 54,
              height: 54,
              background: "radial-gradient(circle at 30% 0, #38bdf8, #1d4ed8)",
              boxShadow: "0 0 18px rgba(59,130,246,0.55)",
              "&:hover": {
                boxShadow: "0 0 22px rgba(59,130,246,0.75)",
              },
            }}
          >
            <Avatar
              src={me?.avatarUrl || supfileLogo}
              alt="Profil"
              sx={{
                width: 48,
                height: 48,
                bgcolor: "rgba(2,6,23,0.25)",
              }}
              imgProps={{
                style: { objectFit: "contain" },
              }}
            />
          </IconButton>
        </Tooltip>

        {/* MENU PROFIL */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: (theme) => ({
              mt: 1,
              minWidth: 220,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(11,16,32,0.92)"
                  : "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
            }),
          }}
        >
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate("/profile"); // ✅ tu peux remplacer par "/settings" si vous n’avez pas /profile
            }}
          >
            <ListItemIcon>
              <PersonRoundedIcon fontSize="small" />
            </ListItemIcon>
            Mon profil
          </MenuItem>

          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate("/settings");
            }}
          >
            <ListItemIcon>
              <SettingsRoundedIcon fontSize="small" />
            </ListItemIcon>
            Paramètres
          </MenuItem>

          <Divider />

          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleLogout();
            }}
            sx={{ color: "#fca5a5" }}
          >
            <ListItemIcon sx={{ color: "#fca5a5" }}>
              <LogoutRoundedIcon fontSize="small" />
            </ListItemIcon>
            Déconnexion
          </MenuItem>
        </Menu>
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

        {/* Gardé : bouton logout bas (si tu veux le garder) */}
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