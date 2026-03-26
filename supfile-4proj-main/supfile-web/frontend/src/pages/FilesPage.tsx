// src/pages/FilesPage.tsx
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

// ---- Mock data (plus tard: API)
type FileItem = {
  id: number;
  name: string;
  type: "folder" | "image" | "video" | "audio" | "pdf" | "text" | "other";
  size: string;
  modified: string;
};

const mockFiles: FileItem[] = [
  { id: 1, name: "Projet M1",        type: "folder", size: "—",        modified: "Aujourd'hui 14:20" },
  { id: 2, name: "Ressources",       type: "folder", size: "—",        modified: "Hier 09:11" },
  { id: 3, name: "Cours-SUPFILE.pdf",type: "pdf",    size: "4.2 MB",   modified: "Aujourd'hui 12:41" },
  { id: 4, name: "maquette.png",     type: "image",  size: "1.1 MB",   modified: "Hier 18:03" },
  { id: 5, name: "brief.md",         type: "text",   size: "24 KB",    modified: "Hier 16:20" },
  { id: 6, name: "video-demo.mp4",   type: "video",  size: "310 MB",   modified: "02/12/2025" },
  { id: 7, name: "soundtrack.mp3",   type: "audio",  size: "8.4 MB",   modified: "01/12/2025" },
  { id: 8, name: "archive.zip",      type: "other",  size: "54 MB",    modified: "30/11/2025" },
];

function FileIcon({ type }: { type: FileItem["type"] }) {
  const props = { fontSize: "small" as const };
  switch (type) {
    case "folder": return <FolderRoundedIcon {...props} sx={{ color: "#facc15" }} />;
    case "image":  return <ImageRoundedIcon {...props} sx={{ color: "#34d399" }} />;
    case "video":  return <MovieRoundedIcon {...props} sx={{ color: "#60a5fa" }} />;
    case "audio":  return <MusicNoteRoundedIcon {...props} sx={{ color: "#c084fc" }} />;
    case "pdf":    return <DescriptionRoundedIcon {...props} sx={{ color: "#f87171" }} />;
    case "text":   return <DescriptionRoundedIcon {...props} sx={{ color: "#94a3b8" }} />;
    default:       return <InsertDriveFileRoundedIcon {...props} sx={{ color: "#94a3b8" }} />;
  }
}

const TYPE_LABELS: Record<FileItem["type"], string> = {
  folder: "Dossier",
  image:  "Image",
  video:  "Vidéo",
  audio:  "Audio",
  pdf:    "PDF",
  text:   "Texte",
  other:  "Fichier",
};

export default function FilesPage() {
  const [selected, setSelected] = useState<number | null>(null);

  const glassCardSx = (theme: any) => ({
    p: 2,
    borderRadius: 4,
    backdropFilter: "blur(12px)",
    border: `1px solid ${theme.palette.divider}`,
    bgcolor:
      theme.palette.mode === "dark"
        ? "rgba(11,16,32,0.72)"
        : "rgba(255,255,255,0.8)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 14px 35px rgba(15,23,42,0.55)"
        : "0 14px 35px rgba(15,23,42,0.08)",
  });

  const rowSx = (theme: any, isSelected: boolean) => ({
    display: "grid",
    gridTemplateColumns: "2fr 100px 120px 180px 80px",
    alignItems: "center",
    gap: 1,
    px: 1.5,
    py: 1,
    borderRadius: 2,
    cursor: "pointer",
    bgcolor: isSelected
      ? theme.palette.mode === "dark"
        ? "rgba(79,124,255,0.14)"
        : "rgba(79,124,255,0.08)"
      : "transparent",
    "&:hover": {
      bgcolor:
        theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.04)"
          : "rgba(2,6,23,0.04)",
    },
  });

  const pillSx = (theme: any) => ({
    border: `1px solid ${theme.palette.divider}`,
    bgcolor:
      theme.palette.mode === "dark"
        ? "rgba(15,23,42,0.60)"
        : "rgba(2,6,23,0.04)",
  });

  return (
    <Stack spacing={2.2}>
      {/* Header */}
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
            Mes fichiers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Tous vos fichiers et dossiers en un seul endroit.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<SearchRoundedIcon />}>
            Rechercher
          </Button>
          <Button variant="outlined" startIcon={<CreateNewFolderRoundedIcon />}>
            Nouveau dossier
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadRoundedIcon />}
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

      {/* File list */}
      <Paper sx={glassCardSx}>
        {/* Column headers */}
        <Box
          sx={(theme) => ({
            display: "grid",
            gridTemplateColumns: "2fr 100px 120px 180px 80px",
            gap: 1,
            px: 1.5,
            pb: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          })}
        >
          {["Nom", "Type", "Taille", "Modifié", ""].map((h) => (
            <Typography key={h} variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {h}
            </Typography>
          ))}
        </Box>

        {/* Rows */}
        <Stack spacing={0.3} sx={{ mt: 0.8 }}>
          {mockFiles.map((f) => (
            <Box
              key={f.id}
              sx={(theme) => rowSx(theme, selected === f.id)}
              onClick={() => setSelected(f.id === selected ? null : f.id)}
            >
              {/* Nom */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <FileIcon type={f.type} />
                <Tooltip title={f.name} placement="top" arrow>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </Typography>
                </Tooltip>
              </Box>

              {/* Type */}
              <Chip
                label={TYPE_LABELS[f.type]}
                size="small"
                variant="outlined"
                sx={pillSx}
              />

              {/* Taille */}
              <Typography variant="body2" color="text.secondary">
                {f.size}
              </Typography>

              {/* Modifié */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {f.modified}
              </Typography>

              {/* Actions */}
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Tooltip title="Partager" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ opacity: selected === f.id ? 1 : 0, ".MuiBox-root:hover &": { opacity: 1 } }}
                  >
                    <ShareRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Supprimer" arrow>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ opacity: selected === f.id ? 1 : 0, ".MuiBox-root:hover &": { opacity: 1 } }}
                  >
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
