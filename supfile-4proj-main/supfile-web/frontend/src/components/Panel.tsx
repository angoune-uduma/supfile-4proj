import {
  Box,
  Paper,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";

export default function Panel({
  title,
  subtitle,
  actionText,
  table,
  list,
}: any) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 4,
        bgcolor: "rgba(11,16,32,0.72)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 14px 35px rgba(15,23,42,0.55)",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        {actionText ? (
          <Typography
            variant="body2"
            sx={{ color: "primary.main", cursor: "pointer", mt: 0.3 }}
          >
            {actionText}
          </Typography>
        ) : null}
      </Box>

      {table ? (
        <Box sx={{ mt: 1.6 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "text.secondary" }}>Client</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>Type</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>Date</TableCell>
                <TableCell sx={{ color: "text.secondary" }} align="right">
                  Montant
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["Dakar Logistics SARL (Sénégal)", "Facturation – Site web", "04/12/2025", "+ 1 800 000 XAF"],
                ["Abidjan Digital Studio (Côte d’Ivoire)", "Encaissement – Maquettes UI", "03/12/2025", "+ 950 000 XAF"],
                ["Yaoundé AgroTech (Cameroun)", "Acompte – Paiement en ligne", "02/12/2025", "+ 650 000 XAF"],
              ].map((r) => (
                <TableRow key={r[0]}>
                  <TableCell sx={{ fontWeight: 600 }}>{r[0]}</TableCell>
                  <TableCell>
                    <Chip
                      label={r[1]}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "rgba(148,163,184,0.25)",
                        bgcolor: "rgba(15,23,42,0.55)",
                        color: "text.secondary",
                      }}
                    />
                  </TableCell>
                  <TableCell>{r[2]}</TableCell>
                  <TableCell align="right" sx={{ color: "#22c55e", fontWeight: 800 }}>
                    {r[3]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {list ? (
        <Stack spacing={1.1} sx={{ mt: 1.6 }}>
          {[
            ["Création d’un site internet vitrine", "Client : Dakar Logistics"],
            ["Création de maquettes UI/UX", "Client : Abidjan Digital Studio"],
            ["Configuration d’un système de paiement en ligne", "Client : Yaoundé AgroTech"],
          ].map((x) => (
            <Paper
              key={x[0]}
              sx={{
                p: 1.4,
                borderRadius: 3,
                bgcolor: "rgba(15,23,42,0.65)",
                borderColor: "rgba(248,113,113,0.22)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <Typography sx={{ fontWeight: 650 }}>{x[0]}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 650 }}>
                  {x[1]}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      ) : null}
    </Paper>
  );
}