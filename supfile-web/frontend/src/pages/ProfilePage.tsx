import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "../services/api";

import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";

import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";

type Me = {
  id?: string;
  email: string;
  avatarUrl?: string | null;
  avatarMeta?: unknown;
  provider?: "local" | "google" | "github";
};

export default function ProfilePage() {
  const nav = useNavigate();

  const [me, setMe] = useState<Me | null>(null);

  // form profile
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  // form password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loadingPwd, setLoadingPwd] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState<string | null>(null);

  const pageBg = useMemo(
    () => ({
      px: { xs: 0, md: 0 },
      py: { xs: 0, md: 0 },
    }),
    []
  );

  const cardSx = (theme: Theme) => ({
    p: { xs: 2, md: 2.4 },
    borderRadius: 4,
    border: `1px solid ${theme.palette.divider}`,
    bgcolor:
      theme.palette.mode === "dark"
        ? "rgba(11,16,32,0.72)"
        : "rgba(255,255,255,0.80)",
    backdropFilter: "blur(12px)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 14px 35px rgba(15,23,42,0.55)"
        : "0 14px 35px rgba(15,23,42,0.08)",
  });

  const inputSx = (theme: Theme) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: 999,
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(15,23,42,0.55)"
          : "rgba(2,6,23,0.04)",
      "& fieldset": { borderColor: theme.palette.divider },
      "&:hover fieldset": {
        borderColor:
          theme.palette.mode === "dark"
            ? "rgba(148,163,184,0.38)"
            : "rgba(15,23,42,0.20)",
      },
      "&.Mui-focused fieldset": {
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiInputLabel-root": {
      color: theme.palette.text.secondary,
    },
  });

  const pillBtnSx = (_theme: Theme) => ({
    borderRadius: 999,
    textTransform: "none",
    fontWeight: 700,
  });

  async function loadMe() {
    setProfileError(null);
    setProfileOk(null);

    const { res, data } = await apiFetch("/user/me", { method: "GET" });

    if (!res.ok) {
      if (res.status === 401) {
        clearTokens();
        nav("/login", { replace: true });
        return;
      }
      setProfileError(data?.error || "Impossible de récupérer le profil.");
      return;
    }

    const next: Me = {
      id: data?.id || data?._id,
      email: data?.email,
      avatarUrl: data?.avatarUrl ?? null,
      avatarMeta: data?.avatarMeta,
      provider: data?.provider,
    };

    setMe(next);
    setEmail(next.email || "");
    setAvatarUrl(next.avatarUrl || "");
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected if needed
    e.target.value = "";

    const formData = new FormData();
    formData.append("avatar", file);

    const token = localStorage.getItem("accessToken");
    const res = await fetch("http://localhost:4000/user/me/avatar", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      setAvatarUrl(data.avatarUrl);
      setProfileOk("Avatar mis à jour ✅");
      await loadMe();
      window.dispatchEvent(new Event("profile-updated"));
    } else {
      setProfileError(data?.error || "Erreur upload avatar.");
    }
  }

  async function onChangePassword() {
    setPasswordError(null);
    setPasswordOk(null);

    if (!oldPassword.trim()) {
      setPasswordError("L'ancien mot de passe est obligatoire.");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("Le nouveau mot de passe est obligatoire.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoadingPwd(true);

    try {
      const { res, data } = await apiFetch("/user/me/password", {
        method: "PATCH",
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          clearTokens();
          nav("/login", { replace: true });
          return;
        }
        if (data?.error === "INVALID_OLD_PASSWORD") {
          setPasswordError("L'ancien mot de passe est incorrect.");
          return;
        }
        if (data?.error === "OAUTH_ACCOUNT_NO_PASSWORD") {
          setPasswordError("Ce compte ne possède pas de mot de passe local.");
          return;
        }
        setPasswordError(data?.error || "Erreur mise à jour mot de passe.");
        return;
      }

      setPasswordOk("Mot de passe mis à jour ✅");
      setOldPassword("");
      setNewPassword("");
    } catch {
      setPasswordError("Erreur serveur.");
    } finally {
      setLoadingPwd(false);
    }
  }

  const displayedEmail = me?.email || email || "—";

  return (
    <Box sx={pageBg}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "0.01em" }}>
            Mon profil
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.4 }}>
            Gère les informations de ton compte.
          </Typography>

          {profileError && (
            <Typography sx={{ mt: 1, color: "error.main", fontWeight: 700 }}>
              {profileError}
            </Typography>
          )}
          {profileOk && (
            <Typography sx={{ mt: 1, color: "success.main", fontWeight: 700 }}>
              {profileOk}
            </Typography>
          )}
        </Box>

        <Paper sx={cardSx}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={me?.avatarUrl || undefined}
                sx={(theme) => ({
                  width: 72,
                  height: 72,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(79,124,255,0.10)"
                      : "rgba(79,124,255,0.08)",
                  color: "primary.main",
                  border: `1px solid ${theme.palette.divider}`,
                })}
              >
                {(displayedEmail?.[0] || "U").toUpperCase()}
              </Avatar>

              <Tooltip title="Changer l'avatar" placement="right" arrow>
                <IconButton
                  size="small"
                  sx={(theme) => ({
                    position: "absolute",
                    right: -6,
                    bottom: -6,
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(15,23,42,0.75)"
                        : "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(10px)",
                    "&:hover": {
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(15,23,42,0.92)"
                          : "rgba(255,255,255,0.95)",
                    },
                  })}
                  onClick={() => document.getElementById("avatarFileInput")?.click()}
                >
                  <PhotoCameraRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
                {displayedEmail}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.3 }}>
                Compte connecté
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.6}>
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="small"
              sx={inputSx}
              autoComplete="email"
              disabled={me?.provider !== "local"}
              helperText={
                me?.provider !== "local"
                  ? `L'adresse email est gérée par ${me?.provider}.`
                  : undefined
              }
            />

            {/* Upload avatar — déclenché automatiquement au choix du fichier */}
            <input
              id="avatarFileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={onAvatarUpload}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="outlined"
                sx={pillBtnSx}
                onClick={() => document.getElementById("avatarFileInput")?.click()}
                startIcon={<PhotoCameraRoundedIcon />}
              >
                Choisir un avatar
              </Button>
              {avatarUrl && (
                <Typography variant="caption" color="success.main">
                  Image chargée ✅
                </Typography>
              )}
            </Box>

            {/* Bouton Retour uniquement — l'avatar est sauvegardé automatiquement */}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" sx={pillBtnSx} onClick={() => nav(-1)}>
                Retour
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.2 }} />

          <Stack spacing={1.6}>
            {me?.provider !== "local" ? (
              <>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  Sécurité
                </Typography>
                <Typography color="text.secondary">
                  Ton compte est connecté via {me?.provider}. Le mot de passe est géré par ce service.
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  Sécurité
                </Typography>

                {passwordError && (
                  <Typography sx={{ color: "error.main", fontWeight: 700 }}>
                    {passwordError}
                  </Typography>
                )}
                {passwordOk && (
                  <Typography sx={{ color: "success.main", fontWeight: 700 }}>
                    {passwordOk}
                  </Typography>
                )}

                <TextField
                  label="Ancien mot de passe"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  fullWidth
                  size="small"
                  sx={inputSx}
                  autoComplete="current-password"
                />

                <TextField
                  label="Nouveau mot de passe"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  size="small"
                  sx={inputSx}
                  autoComplete="new-password"
                  helperText="Minimum 8 caractères."
                />

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="secondary"
                    sx={(theme) => ({
                      ...pillBtnSx(theme),
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(148,163,184,0.12)"
                          : "rgba(2,6,23,0.06)",
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.divider}`,
                      "&:hover": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "rgba(148,163,184,0.16)"
                            : "rgba(2,6,23,0.08)",
                      },
                    })}
                    onClick={onChangePassword}
                    disabled={loadingPwd}
                  >
                    {loadingPwd ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}