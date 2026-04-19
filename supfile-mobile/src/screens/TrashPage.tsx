import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import RestoreFromTrashRoundedIcon from "@mui/icons-material/RestoreFromTrashRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";

import {
  emptyTrash,
  hardDeleteItem,
  listTrash,
  restoreItem,
} from "../services/files";

type TrashItem = {
  id: string;
  originalName: string;
  mimeType: string | null;
  type: "file" | "folder";
  size: number;
  parentId: string | null;
  deletedAt: string;
  createdAt: string;
  updatedAt: string;
};

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
}

function getFileIcon(item: TrashItem) {
  if (item.type === "folder") return <FolderRoundedIcon fontSize="small" />;
  if (item.mimeType?.startsWith("image/")) return <ImageRoundedIcon fontSize="small" />;
  if (item.mimeType?.startsWith("video/")) return <MovieRoundedIcon fontSize="small" />;
  if (item.mimeType?.startsWith("audio/")) return <MusicNoteRoundedIcon fontSize="small" />;
  if (
    item.mimeType === "application/pdf" ||
    item.mimeType?.includes("word") ||
    item.mimeType?.includes("text")
  ) {
    return <DescriptionRoundedIcon fontSize="small" />;
  }
  return <InsertDriveFileRoundedIcon fontSize="small" />;
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [confirmHardDeleteOpen, setConfirmHardDeleteOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<TrashItem | null>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
    });
  }, [items]);

  async function loadTrash() {
    setLoading(true);
    setError(null);

    const { res, data } = await listTrash();

    if (!res.ok) {
      setError(data?.error || "Impossible de charger la corbeille.");
      setLoading(false);
      return;
    }

    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTrash();
  }, []);

  async function handleRestore(item: TrashItem) {
    const { res, data } = await restoreItem(item.id);

    if (!res.ok) {
      setError(data?.error || "Restauration impossible.");
      return;
    }

    await loadTrash();
  }

  async function handleHardDelete() {
    if (!targetItem) return;

    const { res, data } = await hardDeleteItem(targetItem.id);

    if (!res.ok) {
      setError(data?.error || "Suppression définitive impossible.");
      return;
    }

    setConfirmHardDeleteOpen(false);
    setTargetItem(null);
    await loadTrash();
  }

  async function handleEmptyTrash() {
    const { res, data } = await emptyTrash();

    if (!res.ok) {
      setError(data?.error || "Impossible de vider la corbeille.");
      return;
    }

    setConfirmEmptyOpen(false);
    await loadTrash();
  }

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
  });

  const itemCardSx = (theme: any) => ({
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.mode === "dark" ? "rgba(15,23,42,0.58)" : "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    p: 1.4,
    transition: "all 0.18s ease",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow:
        theme.palette.mode === "dark"
          ? "0 10px 22px rgba(15,23,42,0.36)"
          : "0 10px 22px rgba(15,23,42,0.08)",
    },
  });

  return (
    <Stack spacing={2.2}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Corbeille
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Restaurez ou supprimez définitivement vos éléments supprimés.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepRoundedIcon />}
          onClick={() => setConfirmEmptyOpen(true)}
          disabled={items.length === 0}
        >
          Vider la corbeille
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={glassCardSx}>
        <Stack spacing={2}>
          {loading ? (
            <Typography color="text.secondary">Chargement...</Typography>
          ) : sortedItems.length === 0 ? (
            <Typography color="text.secondary">
              La corbeille est vide.
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.4,
              }}
            >
              {sortedItems.map((item) => (
                <Paper key={item.id} sx={itemCardSx}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 1.2,
                      alignItems: "center",
                    }}
                  >
                    <Avatar
                      sx={(theme) => ({
                        width: 38,
                        height: 38,
                        bgcolor:
                          item.type === "folder"
                            ? theme.palette.mode === "dark"
                              ? "rgba(59,130,246,0.18)"
                              : "rgba(59,130,246,0.10)"
                            : theme.palette.mode === "dark"
                            ? "rgba(148,163,184,0.18)"
                            : "rgba(148,163,184,0.12)",
                        color: item.type === "folder" ? "primary.main" : "text.secondary",
                      })}
                    >
                      {getFileIcon(item)}
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                      <Tooltip title={item.originalName}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.originalName}
                        </Typography>
                      </Tooltip>

                      <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          size="small"
                          label={item.type === "folder" ? "Dossier" : "Fichier"}
                          variant="outlined"
                        />
                        {item.type === "file" && (
                          <Chip size="small" label={formatSize(item.size)} variant="outlined" />
                        )}
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.7 }}>
                        Supprimé le {formatDate(item.deletedAt)}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.4}>
                      <Tooltip title="Restaurer">
                        <IconButton size="small" onClick={() => handleRestore(item)}>
                          <RestoreFromTrashRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Supprimer définitivement">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setTargetItem(item);
                            setConfirmHardDeleteOpen(true);
                          }}
                        >
                          <DeleteForeverRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Stack>
      </Paper>

      <Dialog open={confirmEmptyOpen} onClose={() => setConfirmEmptyOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Vider la corbeille</DialogTitle>
        <DialogContent>
          <Typography>
            Tous les éléments supprimés seront effacés définitivement.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEmptyOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleEmptyTrash}>
            Vider
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmHardDeleteOpen}
        onClose={() => setConfirmHardDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <Typography>
            "{targetItem?.originalName}" sera supprimé définitivement.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmHardDeleteOpen(false);
              setTargetItem(null);
            }}
          >
            Annuler
          </Button>
          <Button color="error" variant="contained" onClick={handleHardDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}