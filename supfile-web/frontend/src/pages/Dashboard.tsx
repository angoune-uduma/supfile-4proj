import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "../services/api";
import {
  getDashboardRecent,
  getDashboardUsage,
  getSharesWithMe,
  getTrashCount,
} from "../services/bloc4";


import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";

import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";

import StatCard from "../components/StatCard";

function bytesToGb(bytes: number) {
  return bytes / (1024 * 1024 * 1024);
}

function formatStorageFromGb(n: number) {
  if (n < 1) {
    return `${(n * 1024).toFixed(1)} MB`;
  }
  return `${n.toFixed(1)} Go`;
}

function percent(used: number, total: number) {
  if (!total || total <= 0) return 0;
  const p = (used / total) * 100;
  return Math.max(0, Math.min(100, p));
}

function iconFor(key: string) {
  if (key === "video") return <MovieRoundedIcon fontSize="small" />;
  if (key === "image") return <ImageRoundedIcon fontSize="small" />;
  if (key === "audio") return <MusicNoteRoundedIcon fontSize="small" />;
  if (key === "document") return <DescriptionRoundedIcon fontSize="small" />;
  return <InsertDriveFileRoundedIcon fontSize="small" />;
}

function UsageStackBar({ used, total }: { used: number; total: number }) {
  const usedPct = percent(used, total);

  return (
    <Box sx={{ mt: 1.6 }}>
      <Box
        sx={(theme) => ({
          height: 12,
          borderRadius: 999,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === "dark" ? "rgba(15,23,42,0.55)" : "rgba(2,6,23,0.06)",
          overflow: "hidden",
        })}
      >
        <Box
          sx={{
            height: "100%",
            width: `${usedPct}%`,
            background: "linear-gradient(90deg, rgba(79,124,255,0.95), rgba(56,189,248,0.85))",
          }}
        />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.8 }}>
        <Typography variant="caption" color="text.secondary">
          Utilisé: {formatStorageFromGb(used)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Libre: {formatStorageFromGb(Math.max(0, total - used))}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const nav = useNavigate();

  const [me, setMe] = useState<{ email: string; avatarUrl?: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [quotaGb, setQuotaGb] = useState<number>(30);
  const [usedGb, setUsedGb] = useState<number>(0);

  const [breakdown, setBreakdown] = useState<Array<{ label: string; gb: number; iconKey: string }>>([]);

  const [trashCount, setTrashCount] = useState<number>(0);

  const [recentFiles, setRecentFiles] = useState<
    Array<{ name: string; type: string; size: string; modified: string }>
  >([]);

  const [recentShares, setRecentShares] = useState<
    Array<{ target: string; item: string; expires: string }>
  >([]);


  useEffect(() => {
    (async () => {
      const { res, data } = await apiFetch("/user/me", { method: "GET" });

      if (!res.ok) {
        if (res.status === 401) {
          clearTokens();
          nav("/login", { replace: true });
          return;
        }
        setErr(data?.error || "Impossible de récupérer le profil.");
        return;
      }

      setMe(data);
    })();
  }, [nav]);

  useEffect(() => {
    (async () => {
      try {
        const usageData = await getDashboardUsage();

        const qGb = bytesToGb(Number(usageData?.quotaBytes || 0));
        const uGb = bytesToGb(Number(usageData?.usedBytes || 0));

        setQuotaGb(Number.isFinite(qGb) && qGb > 0 ? qGb : 30);
        setUsedGb(Number.isFinite(uGb) && uGb >= 0 ? uGb : 0);

        const mapped = (usageData?.byCategory || []).map((c: { bytes: number; key: string }) => {
          const gb = bytesToGb(Number(c?.bytes || 0));

          if (c.key === "video") return { label: "Vidéos", gb, iconKey: "video" };
          if (c.key === "image") return { label: "Images", gb, iconKey: "image" };
          if (c.key === "audio") return { label: "Audio", gb, iconKey: "audio" };
          if (c.key === "document") return { label: "Documents", gb, iconKey: "document" };
          return { label: "Autres", gb, iconKey: "other" };
        });

        setBreakdown(mapped);

        const recent = await getDashboardRecent(5);
        setRecentFiles(
          recent.map((r: any) => ({
            name: r.name || "—",
            type: r.type === "folder" ? "Dossier" : "Fichier",
            size: r.sizeBytes ? `${(r.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "—",
            modified: r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—",
          }))
        );

        const withMe = await getSharesWithMe();
        setRecentShares(
          withMe.slice(0, 3).map((s: any) => ({
            target: `Partagé avec moi par ${s.fromUser?.email || "?"}`,
            item: `${s.nodeType === "folder" ? "Dossier" : "Fichier"}: ${s.name || "—"}`,
            expires: "—",
          }))
        );
        const trash = await getTrashCount();
        setTrashCount(trash);
      } catch (e: any) {
        setErr(e?.message || "Erreur lors du chargement du dashboard.");
      }
    })();
  }, []);

  const pillSx = (theme: any) => ({
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.mode === "dark" ? "rgba(15,23,42,0.60)" : "rgba(2,6,23,0.04)",
  });

  const smallPanelSx = (theme: any) => ({
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.mode === "dark" ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
  });

  const glassCardSx = (theme: any) => ({
    p: 2,
    borderRadius: 4,
    backdropFilter: "blur(12px)",
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.mode === "dark" ? "rgba(11,16,32,0.72)" : "rgba(255,255,255,0.8)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 14px 35px rgba(15,23,42,0.55)"
        : "0 14px 35px rgba(15,23,42,0.08)",
    minWidth: 0,
  });

  const heroSx = (theme: any) => ({
    p: 2.4,
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
    bgcolor: theme.palette.mode === "dark" ? "rgba(11,16,32,0.75)" : "rgba(255,255,255,0.75)",
    backdropFilter: "blur(16px)",
    border: `1px solid ${theme.palette.divider}`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 18px 50px rgba(15,23,42,0.6)"
        : "0 18px 45px rgba(15,23,42,0.08)",
    "&:after": {
      content: '""',
      position: "absolute",
      inset: "auto -120px -160px auto",
      width: 280,
      height: 280,
      background: "radial-gradient(circle, rgba(79,124,255,0.22), transparent 60%)",
      opacity: 0.9,
      pointerEvents: "none",
    },
  });

  const linksActive = recentShares.length;

  return (
    <Stack spacing={2.2}>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Vue rapide de votre espace de stockage et de l’activité récente.
          </Typography>

          {err && (
            <Typography variant="body2" sx={{ mt: 0.8, color: "error.main" }}>
              {err}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          {me && <Chip label={me.email} variant="outlined" sx={pillSx} />}

          <Button
            variant="outlined"
            startIcon={<SearchRoundedIcon />}
            onClick={() => nav("/files")}
          >
            Rechercher
          </Button>

          <Button
            variant="contained"
            startIcon={<UploadRoundedIcon />}
            onClick={() => nav("/files")}
            sx={(theme) => ({
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 12px 25px rgba(37,99,235,0.35)"
                  : "0 12px 25px rgba(37,99,235,0.22)",
            })}
          >
            Upload
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box>
          <Paper sx={heroSx}>
            <Typography variant="body2" color="text.secondary">
              Espace utilisé
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 30, md: 38 },
                fontWeight: 900,
                letterSpacing: "0.02em",
                mt: 0.4,
              }}
            >
              {formatStorageFromGb(usedGb)} / {quotaGb.toFixed(0)} Go
            </Typography>

            <UsageStackBar used={usedGb} total={quotaGb} />

            <Box sx={{ mt: 2.2, position: "relative", zIndex: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Répartition
              </Typography>

              <Stack direction="row" spacing={1.1} sx={{ flexWrap: "wrap" }}>
                {(breakdown.length ? breakdown : [{ label: "Autres", gb: 0, iconKey: "other" }]).map((b) => (
                  <Paper key={b.label} sx={(theme) => ({ p: 1.2, minWidth: 170, ...smallPanelSx(theme) })}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar
                          sx={(theme) => ({
                            width: 28,
                            height: 28,
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? "rgba(79,124,255,0.12)"
                                : "rgba(79,124,255,0.10)",
                            color: "primary.main",
                          })}
                        >
                          {iconFor(b.iconKey)}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {b.label}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 800 }}>{formatStorageFromGb(b.gb)}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2.2,
                position: "relative",
                zIndex: 1,
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Stack direction="row" spacing={1}>
                <Chip label={`Quota: ${quotaGb.toFixed(0)} Go`} variant="outlined" sx={pillSx} />
                <Chip label="Sync: Activée" variant="outlined" sx={pillSx} />
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolderRoundedIcon />}
                  onClick={() => nav("/files")}
                >
                  Nouveau dossier
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareRoundedIcon />}
                  onClick={() => nav("/shared")}
                >
                  Partager
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>

        <Box>
          <Stack spacing={1.2}>
            <StatCard
              title="Stockage libre"
              value={formatStorageFromGb(Math.max(0, quotaGb - usedGb))}
              pill={`Sur ${quotaGb.toFixed(0)} Go`}
            />
            <StatCard title="Fichiers récents" value={`${recentFiles.length}`} pill="Dernières modifications" />
            <StatCard title="Liens de partage actifs" value={`${linksActive}`} />
            <StatCard
                  title="Corbeille"
                  value={`${trashCount} ${trashCount > 1 ? "éléments" : "élément(s)"}`}
                />
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "7fr 5fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Paper sx={glassCardSx}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Derniers fichiers</Typography>
                <Typography variant="body2" color="text.secondary">
                  Les 5 derniers fichiers modifiés ou uploadés.
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: "primary.main", cursor: "pointer", mt: 0.3 }}
                onClick={() => nav("/files")}
              >
                Tout voir
              </Typography>
            </Box>

            <Box sx={{ mt: 1.6, minWidth: 0, overflow: "hidden" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "text.secondary", width: "48%" }}>Nom</TableCell>
                    <TableCell sx={{ color: "text.secondary", width: 120 }}>Type</TableCell>
                    <TableCell sx={{ color: "text.secondary", width: 110 }}>Taille</TableCell>
                    <TableCell sx={{ color: "text.secondary", width: 160 }} align="right">
                      Modifié
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {recentFiles.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell sx={{ pr: 2 }}>
                        <Tooltip title={f.name} placement="top" arrow>
                          <Typography
                            sx={{
                              fontWeight: 750,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              cursor: "default",
                            }}
                          >
                            {f.name}
                          </Typography>
                        </Tooltip>
                      </TableCell>

                      <TableCell>
                        <Chip label={f.type} size="small" variant="outlined" sx={pillSx} />
                      </TableCell>

                      <TableCell>{f.size}</TableCell>

                      <TableCell align="right" sx={{ pr: 1 }}>
                        <Typography
                          sx={{
                            color: "text.secondary",
                            fontWeight: 650,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "default",
                          }}
                        >
                          {f.modified}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                  {recentFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          Aucun fichier récent.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Paper sx={glassCardSx}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Partages</Typography>
                <Typography variant="body2" color="text.secondary">
                  Liens publics et dossiers partagés récemment.
                </Typography>
              </Box>
              <IconButton size="small" sx={pillSx} onClick={() => nav("/shared")}>
                <LinkRoundedIcon fontSize="small" />
              </IconButton>
            </Box>

            <Stack spacing={1.1} sx={{ mt: 1.6 }}>
              {recentShares.map((s) => (
                <Paper key={`${s.item}-${s.target}`} sx={(theme) => ({ p: 1.4, ...smallPanelSx(theme) })}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Tooltip title={s.item} placement="top" arrow>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "default",
                          }}
                        >
                          {s.item}
                        </Typography>
                      </Tooltip>

                      <Tooltip title={s.target} placement="top" arrow>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "default",
                          }}
                        >
                          {s.target}
                        </Typography>
                      </Tooltip>
                    </Box>

                    <Tooltip title={s.expires} placement="top" arrow>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 700,
                          maxWidth: 190,
                          textAlign: "right",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "default",
                        }}
                      >
                        {s.expires}
                      </Typography>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}

              {recentShares.length === 0 && (
                <Paper sx={(theme) => ({ p: 1.4, ...smallPanelSx(theme) })}>
                  <Typography variant="body2" color="text.secondary">
                    Aucun partage récent.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
}