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
      sx={(theme) => ({
        p: compact ? 1.4 : 1.7,
        borderRadius: 999, // look "pill" premium comme ta maquette
        border: `1px solid ${theme.palette.divider}`,
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(11,16,32,0.72)"
            : "rgba(255,255,255,0.80)",
        backdropFilter: "blur(12px)",
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 14px 35px rgba(15,23,42,0.45)"
            : "0 14px 35px rgba(15,23,42,0.08)",
      })}
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
            sx={(theme) => ({
              height: 22,
              fontSize: 11,
              borderColor: theme.palette.divider,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(15,23,42,0.55)"
                  : "rgba(2,6,23,0.04)",
            })}
          />
        ) : null}
      </Stack>

      <Typography sx={{ fontWeight: 900, mt: 0.6, fontSize: compact ? 18 : 22 }}>
        {value}
      </Typography>
    </Paper>
  );
}