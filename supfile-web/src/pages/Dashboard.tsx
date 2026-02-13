import {
  Box,
  Button,
  Chip,
  Grid,
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

// ---- Mock data (plus tard: API)
const QUOTA_GB = 30;
const usage = {
  used: 12.4, // Go
  breakdown: [
    { label: "Vidéos", gb: 6.2, icon: <MovieRoundedIcon fontSize="small" /> },
    { label: "Images", gb: 3.1, icon: <ImageRoundedIcon fontSize="small" /> },
    { label: "Documents", gb: 2.4, icon: <DescriptionRoundedIcon fontSize="small" /> },
    { label: "Audio", gb: 0.5, icon: <MusicNoteRoundedIcon fontSize="small" /> },
    { label: "Autres", gb: 0.2, icon: <InsertDriveFileRoundedIcon fontSize="small" /> },
  ],
};

const recentFiles = [
  { name: "Cours-SUPFILE.pdf", type: "PDF", size: "4.2 MB", modified: "Aujourd’hui 12:41" },
  { name: "maquette-dashboard.png", type: "Image", size: "1.1 MB", modified: "Hier 18:03" },
  { name: "brief-projet.md", type: "Texte", size: "24 KB", modified: "Hier 16:20" },
  { name: "video-demo.mp4", type: "Vidéo", size: "310 MB", modified: "02/12/2025" },
  { name: "notes.txt", type: "Texte", size: "3 KB", modified: "01/12/2025" },
];

const recentShares = [
  { target: "Lien public", item: "Cours-SUPFILE.pdf", expires: "Expire dans 3 jours" },
  { target: "Partagé avec", item: "Dossier: Projet M1", expires: "—" },
  { target: "Lien public", item: "video-demo.mp4", expires: "Protégé par mot de passe" },
];

function formatGb(n: number) {
  return `${n.toFixed(1)} Go`;
}

function percent(used: number, total: number) {
  const p = (used / total) * 100;
  return Math.max(0, Math.min(100, p));
}

// Mini “bar chart” (stack) sans librairie
function UsageStackBar() {
  const usedPct = percent(usage.used, QUOTA_GB);

  return (
    <Box sx={{ mt: 1.6 }}>
      <Box
        sx={{
          height: 12,
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.22)",
          bgcolor: "rgba(15,23,42,0.55)",
          overflow: "hidden",
        }}
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
          Utilisé: {formatGb(usage.used)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Libre: {formatGb(QUOTA_GB - usage.used)}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Dashboard() {
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
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            Vue rapide de votre espace de stockage et de l’activité récente.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<SearchRoundedIcon />}>
            Rechercher
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadRoundedIcon />}
            sx={{
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              boxShadow: "0 12px 25px rgba(37,99,235,0.35)",
            }}
          >
            Upload
          </Button>
        </Stack>
      </Box>

      {/* Top grid */}
      <Grid container spacing={2}>
        {/* Hero card: Quota + breakdown */}
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: 2.4,
              borderRadius: 4,
              position: "relative",
              overflow: "hidden",
              background: "radial-gradient(circle at top left, #111827, #020617)",
              borderColor: "rgba(30,64,175,0.45)",
              boxShadow: "0 18px 50px rgba(15,23,42,0.6)",
              "&:after": {
                content: '""',
                position: "absolute",
                inset: "auto -120px -160px auto",
                width: 280,
                height: 280,
                background: "radial-gradient(circle, rgba(79,124,255,0.28), transparent 60%)",
                opacity: 0.9,
                pointerEvents: "none",
              },
            }}
          >
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
              {formatGb(usage.used)} / {QUOTA_GB} Go
            </Typography>

            <UsageStackBar />

            {/* Breakdown */}
            <Box sx={{ mt: 2.2, position: "relative", zIndex: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Répartition
              </Typography>

              <Stack direction="row" spacing={1.1} sx={{ flexWrap: "wrap" }}>
                {usage.breakdown.map((b) => (
                  <Paper
                    key={b.label}
                    sx={{
                      p: 1.2,
                      borderRadius: 3,
                      minWidth: 170,
                      bgcolor: "rgba(15,23,42,0.72)",
                      borderColor: "rgba(148,163,184,0.18)",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: "rgba(79,124,255,0.12)",
                            color: "primary.main",
                          }}
                        >
                          {b.icon}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {b.label}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 800 }}>{formatGb(b.gb)}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>

            {/* quick actions */}
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
                <Chip
                  label="Quota: 30 Go"
                  variant="outlined"
                  sx={{ borderColor: "rgba(148,163,184,0.28)", bgcolor: "rgba(15,23,42,0.6)" }}
                />
                <Chip
                  label="Sync: Activée"
                  variant="outlined"
                  sx={{ borderColor: "rgba(148,163,184,0.28)", bgcolor: "rgba(15,23,42,0.6)" }}
                />
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<CreateNewFolderRoundedIcon />}>
                  Nouveau dossier
                </Button>
                <Button variant="outlined" startIcon={<ShareRoundedIcon />}>
                  Partager
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Right metrics */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={1.2}>
            <StatCard title="Stockage libre" value={formatGb(QUOTA_GB - usage.used)} pill="Sur 30 Go" />
            <StatCard title="Fichiers récents" value="5" pill="Dernières modifications" />
            <StatCard title="Liens de partage actifs" value="3" />
            <StatCard title="Corbeille" value="0 élément" />
          </Stack>
        </Grid>
      </Grid>

      {/* Bottom panels */}
      <Grid container spacing={2}>
        {/* Recent files */}
        <Grid item xs={12} lg={7} sx={{ minWidth: 0 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 4,
              bgcolor: "rgba(11,16,32,0.72)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 14px 35px rgba(15,23,42,0.55)",
              minWidth: 0,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Derniers fichiers</Typography>
                <Typography variant="body2" color="text.secondary">
                  Les 5 derniers fichiers modifiés ou uploadés.
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "primary.main", cursor: "pointer", mt: 0.3 }}>
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
                        <Chip
                          label={f.type}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: "rgba(148,163,184,0.25)",
                            bgcolor: "rgba(15,23,42,0.55)",
                            color: "text.secondary",
                          }}
                        />
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
                          }}
                        >
                          {f.modified}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>

        {/* Shares */}
        <Grid item xs={12} lg={5} sx={{ minWidth: 0 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 4,
              bgcolor: "rgba(11,16,32,0.72)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 14px 35px rgba(15,23,42,0.55)",
              minWidth: 0,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Partages</Typography>
                <Typography variant="body2" color="text.secondary">
                  Liens publics et dossiers partagés récemment.
                </Typography>
              </Box>
              <IconButton
                size="small"
                sx={{
                  border: "1px solid rgba(148,163,184,0.22)",
                  bgcolor: "rgba(15,23,42,0.55)",
                }}
              >
                <LinkRoundedIcon fontSize="small" />
              </IconButton>
            </Box>

            <Stack spacing={1.1} sx={{ mt: 1.6 }}>
              {recentShares.map((s) => (
                <Paper
                  key={`${s.item}-${s.target}`}
                  sx={{
                    p: 1.4,
                    borderRadius: 3,
                    bgcolor: "rgba(15,23,42,0.65)",
                    borderColor: "rgba(79,124,255,0.22)",
                  }}
                >
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
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}