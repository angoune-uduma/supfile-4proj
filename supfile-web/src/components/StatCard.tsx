import { Chip, Paper, Stack, Typography } from "@mui/material";

export default function StatCard({
  title,
  value,
  pill,
  compact,
}: {
  title: string;
  value: string;
  pill?: string;
  compact?: boolean;
}) {
  return (
    <Paper
      sx={{
        p: compact ? 1.4 : 1.7,
        borderRadius: 4,
        bgcolor: "rgba(11,16,32,0.72)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 14px 35px rgba(15,23,42,0.45)",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {pill ? (
          <Chip
            label={pill}
            size="small"
            variant="outlined"
            sx={{
              height: 22,
              fontSize: 11,
              borderColor: "rgba(148,163,184,0.28)",
              bgcolor: "rgba(15,23,42,0.55)",
            }}
          />
        ) : null}
      </Stack>
      <Typography sx={{ fontWeight: 800, mt: 0.6, fontSize: compact ? 18 : 20 }}>
        {value}
      </Typography>
    </Paper>
  );
}