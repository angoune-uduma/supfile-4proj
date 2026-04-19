import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import {
  accessPublicShare,
  getPublicShareMeta,
} from "../services/bloc4";

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function PublicSharePage() {
  const { token = "" } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<any>(null);

  const [password, setPassword] = useState("");
  const [accessReady, setAccessReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getPublicShareMeta(token);
        setMeta(data);
      } catch (e: any) {
        setError(e?.message || "Lien public introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleAccess() {
    try {
      setError("");
      const data = await accessPublicShare(token, password || undefined);
      setPreviewUrl(data.previewUrl || null);
      setDownloadUrl(data.downloadUrl || null);
      setAccessReady(true);
    } catch (e: any) {
      setError(e?.message || "Accès refusé.");
      setAccessReady(false);
      setPreviewUrl(null);
      setDownloadUrl(null);
    }
  }

  const item = meta?.item;
  const mimeType = item?.mimeType || "";
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
        bgcolor: "#050814",
      }}
    >
      <Paper
        sx={(theme) => ({
          width: "100%",
          maxWidth: 900,
          p: 3,
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === "dark" ? "rgba(11,16,32,0.82)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
        })}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Lien partagé
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Accédez à un fichier partagé publiquement.
            </Typography>
          </Box>

          {loading && (
            <Typography color="text.secondary">Chargement...</Typography>
          )}

          {!!error && <Alert severity="error">{error}</Alert>}

          {!loading && item && (
            <Stack spacing={2}>
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 22 }}>
                  {item.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Type : {item.type === "folder" ? "Dossier" : "Fichier"} — Taille : {formatSize(item.size || 0)}
                </Typography>
                {meta?.expiresAt && (
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Expiration : {new Date(meta.expiresAt).toLocaleString()}
                  </Typography>
                )}
              </Paper>

              {meta?.protected && !accessReady && (
                <Stack spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    startIcon={<LockRoundedIcon />}
                    onClick={handleAccess}
                  >
                    Accéder au fichier
                  </Button>
                </Stack>
              )}

              {!meta?.protected && !accessReady && (
                <Button
                  variant="contained"
                  startIcon={<VisibilityRoundedIcon />}
                  onClick={handleAccess}
                >
                  Accéder au fichier
                </Button>
              )}

              {accessReady && item.type === "folder" && (
                <Alert severity="info">
                  Le partage public de dossier est reconnu, mais l’exploration publique du dossier n’est pas encore implémentée.
                </Alert>
              )}

              {accessReady && item.type === "file" && previewUrl && (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      onClick={() => {
                        if (downloadUrl) window.open(downloadUrl, "_blank");
                      }}
                    >
                      Télécharger
                    </Button>
                  </Stack>

                  {isImage && (
                    <img
                      src={previewUrl}
                      alt={item.name}
                      style={{ maxWidth: "100%", borderRadius: 12 }}
                    />
                  )}

                  {isPdf && (
                    <iframe
                      src={previewUrl}
                      width="100%"
                      height="700"
                      title={item.name}
                      style={{ border: "none", borderRadius: 12 }}
                    />
                  )}

                  {isVideo && (
                    <video
                      controls
                      src={previewUrl}
                      style={{ width: "100%", borderRadius: 12 }}
                    />
                  )}

                  {isAudio && (
                    <audio controls src={previewUrl} style={{ width: "100%" }} />
                  )}

                  {!isImage && !isPdf && !isVideo && !isAudio && (
                    <Alert severity="info">
                      Ce type de fichier n’a pas de prévisualisation intégrée. Utilisez le bouton Télécharger.
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}