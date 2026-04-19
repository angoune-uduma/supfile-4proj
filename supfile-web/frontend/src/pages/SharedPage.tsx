import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import { getSharesWithMe } from "../services/bloc4";

type ShareWithMe = {
  id: string;
  nodeId: string;
  nodeType: "file" | "folder";
  name: string;
  createdAt: string;
  fromUser?: { email?: string };
};

function formatDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function SharedPage() {
  const [items, setItems] = useState<ShareWithMe[]>([]);
  const [err, setErr] = useState<string>("");

  async function load() {
    setErr("");
    try {
      const data = await getSharesWithMe();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Impossible de charger les partages.");
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ ouvrir fichier partagé
  async function openFile(share: ShareWithMe) {
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${import.meta.env.VITE_API_URL}/shares/internal/${share.id}/file?disposition=inline`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (e: any) {
      setErr(e?.message || "Impossible d'ouvrir le fichier.");
    }
  }

  // ✅ télécharger fichier partagé
  async function downloadFile(share: ShareWithMe) {
    try {
      const token = localStorage.getItem("accessToken");
      const url = `${import.meta.env.VITE_API_URL}/shares/internal/${share.id}/file?disposition=attachment`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur lors du téléchargement");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = share.name;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      setErr(e?.message || "Impossible de télécharger le fichier.");
    }
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Partagés
          </Typography>
          <Typography color="text.secondary">
            Dossiers/fichiers partagés avec vous
          </Typography>
          {err && (
            <Typography sx={{ mt: 1, color: "error.main", fontWeight: 700 }}>
              {err}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`${items.length} élément(s)`} variant="outlined" />
          <Tooltip title="Rafraîchir">
            <IconButton onClick={load}>
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Partagé par</TableCell>
              <TableCell align="right">Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">
                    Aucun élément partagé pour le moment.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => {
                const isFolder = s.nodeType === "folder";

                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28 }}>
                          {isFolder ? (
                            <FolderRoundedIcon fontSize="small" />
                          ) : (
                            <InsertDriveFileRoundedIcon fontSize="small" />
                          )}
                        </Avatar>
                        <Typography sx={{ fontWeight: 800 }}>{s.name}</Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28 }}>
                          <PersonRoundedIcon fontSize="small" />
                        </Avatar>
                        <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                          {s.fromUser?.email || "—"}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700 }}>
                        {formatDate(s.createdAt)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      {!isFolder && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Ouvrir">
                            <IconButton size="small" onClick={() => openFile(s)}>
                              <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Télécharger">
                            <IconButton size="small" onClick={() => downloadFile(s)}>
                              <DownloadRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}