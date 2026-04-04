//FilesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { MenuItem } from "@mui/material";
import { moveItem } from "../services/files";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import CreateNewFolderRoundedIcon from "@mui/icons-material/CreateNewFolderRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";

import {
  createFolder,
  getBreadcrumbs,
  getDownloadBlob,
  getPreviewBlob,
  listFiles,
  renameItem,
  softDeleteItem,
  uploadFile,
} from "../services/files";

import {
  createInternalShare,
  createPublicShare,
} from "../services/bloc4";

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string | null;
  type: "file" | "folder";
  size: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Crumb = {
  id: string;
  name: string;
};

type TypeFilter = "all" | "file" | "folder";
type MimeFilter = "all" | "image" | "video" | "audio" | "document" | "other";

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getMimeGroup(mimeType: string | null, type: "file" | "folder"): MimeFilter {
  if (type === "folder") return "other";
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("text") ||
    mimeType.includes("document") ||
    mimeType.includes("sheet") ||
    mimeType.includes("presentation")
  ) {
    return "document";
  }

  return "other";
}

function getFileIcon(item: FileItem) {
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

export default function FilesPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareToEmail, setShareToEmail] = useState("");
  const [shareError, setShareError] = useState("");

  // recherche / filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>("all");

  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesName = item.originalName
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());

      const matchesType =
        typeFilter === "all" ? true : item.type === typeFilter;

      const itemMimeGroup = getMimeGroup(item.mimeType, item.type);
      const matchesMime =
        mimeFilter === "all"
          ? true
          : item.type === "file" && itemMimeGroup === mimeFilter;

      return matchesName && matchesType && matchesMime;
    });
  }, [items, searchTerm, typeFilter, mimeFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.originalName.localeCompare(b.originalName);
    });
  }, [filteredItems]);

  async function loadFolder(parentId?: string | null) {
    setLoading(true);
    setError(null);

    const effectiveParentId = parentId ?? null;
    const { res, data } = await listFiles(effectiveParentId);

    if (!res.ok) {
      setError(data?.error || "Impossible de charger les fichiers.");
      setLoading(false);
      return;
    }

    setItems(data.items || []);
    setCurrentParentId(effectiveParentId);

    if (effectiveParentId) {
      const bc = await getBreadcrumbs(effectiveParentId);
      if (bc.res.ok) {
        setBreadcrumbs(bc.data.path || []);
      } else {
        setBreadcrumbs([]);
      }
    } else {
      setBreadcrumbs([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadFolder(null);
  }, []);

  async function handleCreateFolder() {
    if (!folderName.trim()) return;

    const { res, data } = await createFolder(folderName.trim(), currentParentId);

    if (!res.ok) {
      setError(data?.error || "Création du dossier impossible.");
      return;
    }

    setFolderName("");
    setCreateOpen(false);
    await loadFolder(currentParentId);
  }
async function uploadSingleFile(file: File) {
  try {
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);

    const { res, data } = await uploadFile(file, currentParentId, (percent) => {
      setUploadProgress(percent);
    });

    if (!res.ok) {
      setError(data?.error || "Upload impossible.");
      return;
    }

    await loadFolder(currentParentId);
  } finally {
    setUploading(false);
    setUploadProgress(0);
    setUploadingFileName("");
  }
}
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadSingleFile(file);
    e.target.value = "";
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();

    // si on déplace déjà un item interne, ne pas afficher la zone d'upload
    if (draggedItem) return;

    const hasFiles = Array.from(e.dataTransfer.types).includes("Files");
    if (hasFiles) {
      setDragActive(true);
    }
  }

   function handleDragLeave(e: React.DragEvent) {
     e.preventDefault();

     if (draggedItem) return;

     if (!e.currentTarget.contains(e.relatedTarget as Node)) {
       setDragActive(false);
     }
   }

 async function handleDrop(e: React.DragEvent) {
   e.preventDefault();

   // si on était en train de déplacer un item interne,
   // on ne traite PAS ici l'upload global
   if (draggedItem) {
     setDragActive(false);
     return;
   }

   setDragActive(false);

   const files = Array.from(e.dataTransfer.files);
   if (!files.length) return;

   await uploadSingleFile(files[0]);
 }

  async function handleDelete(item: FileItem) {
    const { res, data } = await softDeleteItem(item.id);

    if (!res.ok) {
      setError(data?.error || "Suppression impossible.");
      return;
    }

    await loadFolder(currentParentId);
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;

    const { res, data } = await renameItem(renameTarget.id, renameValue.trim());

    if (!res.ok) {
      setError(data?.error || "Renommage impossible.");
      return;
    }

    setRenameOpen(false);
    setRenameTarget(null);
    setRenameValue("");
    await loadFolder(currentParentId);
  }

  async function handlePreview(item: FileItem) {
    try {
      setError(null);
      setPreviewLoading(true);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const blob = await getPreviewBlob(item.id);
      const objectUrl = URL.createObjectURL(blob);

      setPreviewFile(item);
      setPreviewUrl(objectUrl);
    } catch (err: any) {
      setError(err?.message || "Prévisualisation impossible.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownload(item: FileItem) {
    try {
      setError(null);

      const blob = await getDownloadBlob(item.id);
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = item.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setError(err?.message || "Téléchargement impossible.");
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
  }

  function openShareDialog(item: FileItem) {
    setShareTarget(item);
    setShareLink("");
    setShareExpiresAt("");
    setSharePassword("");
    setShareToEmail("");
    setShareError("");
    setShareOpen(true);
  }

 async function handleCreatePublicShare() {
  if (!shareTarget) return;

  try {
    setShareError("");
    const share = await createPublicShare({
      nodeId: shareTarget.id,
      expiresAt: shareExpiresAt || undefined,
      password: sharePassword || undefined,
    });

    const url = share.url || "";
    setShareLink(url);

    if (url) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore si la copie auto échoue
      }
    }
  } catch (err: any) {
    setShareError(err?.message || "Création du lien public impossible.");
  }
}

  async function handleCreateInternalShare() {
    if (!shareTarget) return;

    if (!shareToEmail.trim()) {
      setShareError("Renseigne l’email du destinataire.");
      return;
    }

    try {
      setShareError("");
      await createInternalShare({
        nodeId: shareTarget.id,
        nodeType: shareTarget.type,
        toEmail: shareToEmail.trim(),
      });
      setShareOpen(false);
    } catch (err: any) {
      setShareError(err?.message || "Partage interne impossible.");
    }
  }

  async function handleCopyShareLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      setShareError("Impossible de copier le lien.");
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setTypeFilter("all");
    setMimeFilter("all");
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
            Mes fichiers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Gérez vos dossiers et vos fichiers.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            component="label"
            variant="contained"
            startIcon={<UploadRoundedIcon />}
            sx={{
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            }}
          >
            Upload
            <input hidden type="file" onChange={handleUpload} />
          </Button>

          <Button
            variant="outlined"
            startIcon={<CreateNewFolderRoundedIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Nouveau dossier
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {uploading && (
        <Paper sx={glassCardSx}>
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 700 }}>
              Upload en cours{uploadingFileName ? ` : ${uploadingFileName}` : ""}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ height: 10, borderRadius: 999 }}
            />

            <Typography variant="body2" color="text.secondary">
              {uploadProgress}%
            </Typography>
          </Stack>
        </Paper>
      )}

      <Paper
        sx={{
          ...glassCardSx,
          border: dragActive
            ? "2px dashed #3b82f6"
            : (theme) => `1px solid ${theme.palette.divider}`,
          background: dragActive
            ? "rgba(59,130,246,0.08)"
            : undefined,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Stack spacing={2}>
            {dragActive && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "2px dashed #3b82f6",
                  textAlign: "center",
                  bgcolor: "rgba(59,130,246,0.08)",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>
                  Déposez votre fichier ici
                </Typography>
              </Box>
            )}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Breadcrumbs>
              <Typography
                sx={{ cursor: "pointer", fontWeight: 700 }}
                onClick={() => loadFolder(null)}
              >
                Racine
              </Typography>

              {breadcrumbs.map((crumb) => (
                <Typography
                  key={crumb.id}
                  sx={{ cursor: "pointer", fontWeight: 700 }}
                  onClick={() => loadFolder(crumb.id)}
                >
                  {crumb.name}
                </Typography>
              ))}
            </Breadcrumbs>

            {currentParentId && (
              <Button
                variant="text"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => {
                  if (breadcrumbs.length >= 2) {
                    loadFolder(breadcrumbs[breadcrumbs.length - 2].id);
                  } else {
                    loadFolder(null);
                  }
                }}
              >
                Retour
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr auto" },
              gap: 1.2,
              alignItems: "center",
            }}
          >
            <TextField
              fullWidth
              label="Rechercher par nom"
              placeholder="ex: pdf, rapport, video..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
              }}
            />

            <TextField
              select
              fullWidth
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <MenuItem value="all">Tous</MenuItem>
              <MenuItem value="file">Fichiers</MenuItem>
              <MenuItem value="folder">Dossiers</MenuItem>
            </TextField>

            <TextField
              select
              fullWidth
              label="Catégorie"
              value={mimeFilter}
              onChange={(e) => setMimeFilter(e.target.value as MimeFilter)}
            >
              <MenuItem value="all">Toutes</MenuItem>
              <MenuItem value="image">Images</MenuItem>
              <MenuItem value="video">Vidéos</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="document">Documents</MenuItem>
              <MenuItem value="other">Autres</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              startIcon={<ClearRoundedIcon />}
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`${sortedItems.length} résultat(s)`} variant="outlined" />
            {typeFilter !== "all" && (
              <Chip label={`Type: ${typeFilter === "file" ? "Fichiers" : "Dossiers"}`} />
            )}
            {mimeFilter !== "all" && (
              <Chip
                label={`Catégorie: ${
                  mimeFilter === "image"
                    ? "Images"
                    : mimeFilter === "video"
                    ? "Vidéos"
                    : mimeFilter === "audio"
                    ? "Audio"
                    : mimeFilter === "document"
                    ? "Documents"
                    : "Autres"
                }`}
              />
            )}
          </Stack>

          {loading ? (
            <Typography color="text.secondary">Chargement...</Typography>
          ) : sortedItems.length === 0 ? (
            <Typography color="text.secondary">
              Aucun fichier ou dossier trouvé.
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
                <Paper
                  key={item.id}
                  sx={{
                    ...itemCardSx,
                    border: dragOverId === item.id ? "2px solid #3b82f6" : undefined,
                    background: dragOverId === item.id ? "rgba(59,130,246,0.1)" : undefined,
                  }}
                  draggable
                  onDragStart={() => {
                    setDraggedItem(item);
                    setDragActive(false);
                  }}
                  onDragEnd={() => {
                    setDraggedItem(null);
                    setDragOverId(null);
                    setDragActive(false);
                  }}
                  onDragOver={(e) => {
                    if (item.type === "folder") {
                      e.preventDefault();
                      setDragOverId(item.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverId(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverId(null);

                    if (uploading) return;
                    if (!draggedItem || item.type !== "folder") return;
                    if (draggedItem.id === item.id) return;

                    const { res, data } = await moveItem(draggedItem.id, item.id);

                    if (!res.ok) {
                      setError(data?.error || "Déplacement impossible.");
                      return;
                    }

                    setDraggedItem(null);
                    await loadFolder(currentParentId);
                  }}
                >
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

                    <Box
                      sx={{ minWidth: 0, cursor: item.type === "folder" ? "pointer" : "default" }}
                      onClick={() => {
                        if (item.type === "folder") {
                          loadFolder(item.id);
                        }
                      }}
                    >
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
                        {item.type === "file" && (
                          <Chip
                            size="small"
                            label={
                              getMimeGroup(item.mimeType, item.type) === "image"
                                ? "Image"
                                : getMimeGroup(item.mimeType, item.type) === "video"
                                ? "Vidéo"
                                : getMimeGroup(item.mimeType, item.type) === "audio"
                                ? "Audio"
                                : getMimeGroup(item.mimeType, item.type) === "document"
                                ? "Document"
                                : "Autre"
                            }
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={0.4}>
                      <Tooltip title="Partager">
                        <IconButton size="small" onClick={() => openShareDialog(item)}>
                          <ShareRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {item.type === "file" && (
                        <Tooltip title="Preview">
                          <IconButton size="small" onClick={() => handlePreview(item)}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {item.type === "file" && (
                        <Tooltip title="Télécharger">
                          <IconButton size="small" onClick={() => handleDownload(item)}>
                            <DownloadRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="Renommer">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setRenameTarget(item);
                            setRenameValue(item.originalName);
                            setRenameOpen(true);
                          }}
                        >
                          <DriveFileRenameOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => handleDelete(item)}>
                          <DeleteRoundedIcon fontSize="small" />
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nouveau dossier</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label="Nom du dossier"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateFolder} variant="contained">
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(previewFile)} onClose={closePreview} maxWidth="lg" fullWidth>
        <DialogTitle>{previewFile?.originalName}</DialogTitle>

        <DialogContent sx={{ minHeight: 400 }}>
          {previewLoading && (
            <Typography color="text.secondary">Chargement de la prévisualisation...</Typography>
          )}

          {!previewLoading && previewFile && previewUrl && previewFile.mimeType?.startsWith("image/") && (
            <img
              src={previewUrl}
              alt={previewFile.originalName}
              style={{ maxWidth: "100%" }}
            />
          )}

          {!previewLoading && previewFile && previewUrl && previewFile.mimeType === "application/pdf" && (
            <iframe
              src={previewUrl}
              width="100%"
              height="600"
              title={previewFile.originalName}
            />
          )}

          {!previewLoading && previewFile && previewUrl && previewFile.mimeType?.startsWith("video/") && (
            <video controls width="100%" src={previewUrl} />
          )}

          {!previewLoading && previewFile && previewUrl && previewFile.mimeType?.startsWith("audio/") && (
            <audio controls style={{ width: "100%" }} src={previewUrl} />
          )}

          {!previewLoading &&
            previewFile &&
            previewUrl &&
            !previewFile.mimeType?.startsWith("image/") &&
            previewFile.mimeType !== "application/pdf" &&
            !previewFile.mimeType?.startsWith("video/") &&
            !previewFile.mimeType?.startsWith("audio/") && (
              <Typography color="text.secondary">
                Ce type de fichier n’a pas de prévisualisation intégrée.
              </Typography>
            )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closePreview}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renommer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label="Nouveau nom"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Annuler</Button>
          <Button onClick={handleRename} variant="contained">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Partager</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 800 }}>
              Élément : {shareTarget?.originalName || "—"}
            </Typography>

            <Box>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>Lien public</Typography>
              <Stack spacing={1.2}>
                <TextField
                  fullWidth
                  label="Expiration (optionnel)"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={shareExpiresAt}
                  onChange={(e) => setShareExpiresAt(e.target.value)}
                />

                <TextField
                  fullWidth
                  label="Mot de passe (optionnel)"
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<LinkRoundedIcon />}
                    onClick={handleCreatePublicShare}
                  >
                    Générer lien
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyRoundedIcon />}
                    disabled={!shareLink}
                    onClick={handleCopyShareLink}
                  >
                    Copier
                  </Button>
                </Stack>

                {shareLink && (
                  <TextField
                    fullWidth
                    label="Lien public"
                    value={shareLink}
                    InputProps={{ readOnly: true }}
                  />
                )}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>
                Partage interne
              </Typography>
              <Stack spacing={1.2}>
                <TextField
                  fullWidth
                  label="Email du destinataire"
                  value={shareToEmail}
                  onChange={(e) => setShareToEmail(e.target.value)}
                />

                <Button
                  variant="outlined"
                  startIcon={<PersonAddRoundedIcon />}
                  onClick={handleCreateInternalShare}
                >
                  Partager en interne
                </Button>
              </Stack>
            </Box>

            {shareError && <Alert severity="error">{shareError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}