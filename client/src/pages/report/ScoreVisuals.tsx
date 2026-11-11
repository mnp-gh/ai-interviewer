import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import { Chip } from "@mui/material";

/** Score bands. The color always comes with an icon and a label, never alone. */
function scoreBand(score: number) {
  if (score >= 8) return { label: "Strong", color: "success" as const, icon: <CheckCircleRounded /> };
  if (score >= 5) return { label: "Getting there", color: "warning" as const, icon: <TrendingUpRounded /> };
  return { label: "Needs work", color: "error" as const, icon: <ErrorOutlineRounded /> };
}

export function ScoreChip({ score, size = "small" }: { score: number; size?: "small" | "medium" }) {
  const band = scoreBand(score);
  return (
    <Chip
      size={size}
      variant="outlined"
      color={band.color}
      icon={band.icon}
      label={`${score}/10 · ${band.label}`}
      sx={{ fontWeight: 700, bgcolor: "background.paper", "& .MuiChip-label": { color: "text.primary" } }}
    />
  );
}
