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

  const [loading, setLoading] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState<string | null>(null);

  // Styles "glass" cohérents dark/light
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

  async function onSave() {
    setProfileError(null);
    setProfileOk(null);
    setLoading(true);

    try {
      const payload: { email?: string; avatarUrl?: string | null } = {};

      if (email?.trim()) payload.email = email.trim();
      payload.avatarUrl = avatarUrl?.trim() ? avatarUrl.trim() : null;

      const { res, data } = await apiFetch("/user/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          clearTokens();
          nav("/login", { replace: true });
          return;
        }
        setProfileError(data?.error || "Erreur lors de la mise à jour du profil.");
        return;
      }

      setProfileOk("Profil mis à jour ✅");
      await loadMe();
    } catch {
      setProfileError("Erreur serveur.");
    } finally {
      setLoading(false);
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
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          clearTokens();
          nav("/login", { replace: true });
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
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, letterSpacing: "0.01em" }}
          >
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

              <Tooltip title="Changer l’avatar (URL)" placement="right" arrow>
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
                  onClick={() => {
                    const el = document.getElementById("avatarUrlInput");
                    el?.focus();
                  }}
                >
                  <PhotoCameraRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}
              >
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
            />

            <TextField
              id="avatarUrlInput"
              label="Avatar URL (optionnel)"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              fullWidth
              size="small"
              sx={inputSx}
              placeholder="https://... (image)"
              autoComplete="off"
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" sx={pillBtnSx} onClick={() => nav(-1)}>
                Retour
              </Button>
              <Button
                variant="contained"
                sx={(theme) => ({
                  ...pillBtnSx(theme),
                  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                  boxShadow:
                    theme.palette.mode === "dark"
                      ? "0 12px 25px rgba(37,99,235,0.35)"
                      : "0 12px 25px rgba(37,99,235,0.22)",
                })}
                onClick={onSave}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.2 }} />

          <Stack spacing={1.6}>
            {me?.provider !== "local" ? (
              // 👉 CAS OAuth (Google / GitHub)
              <>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  Sécurité
                </Typography>

                <Typography color="text.secondary">
                  Ton compte est connecté via {me?.provider}. Le mot de passe est géré par ce service.
                </Typography>
              </>
            ) : (
              // 👉 CAS Local (email/password)
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