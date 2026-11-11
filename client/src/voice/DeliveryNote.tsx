import { Box, Link, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { PAUSE_SECONDS, type Delivery } from "../api/types";
import { clock } from "./recorder";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "um ×3, uh ×1". */
const fillerList = (fillers: Record<string, number>) =>
  Object.entries(fillers)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => `${word} ×${count}`)
    .join(", ");

/** A recording's player; says so plainly once the recording has been removed. */
export function RecordingPlayer({ src }: { src: string }) {
  const [gone, setGone] = useState(false);
  if (gone) {
    return (
      <Typography variant="caption" color="text.secondary">
        This recording is no longer kept.
      </Typography>
    );
  }
  return (
    <Box component="audio" controls preload="none" src={src} onError={() => setGone(true)} sx={{ height: 36, maxWidth: "100%" }}>
      Your browser can't play this recording.
    </Box>
  );
}

/**
 * How a spoken attempt was said: its measurements, its recording, and the speech model's word-for-word
 * transcription (before the candidate's corrections).
 */
export default function DeliveryNote({ delivery, recordingUrl }: { delivery: Delivery; recordingUrl: string | null }) {
  const [showHeard, setShowHeard] = useState(false);
  const facts = [
    clock(delivery.durationSeconds),
    `${delivery.wordsPerMinute} words a minute`,
    delivery.fillerCount ? `${plural(delivery.fillerCount, "filler")} (${fillerList(delivery.fillers)})` : "no fillers",
    delivery.pauseCount ? `${plural(delivery.pauseCount, "pause")} over ${PAUSE_SECONDS}s` : `no pauses over ${PAUSE_SECONDS}s`,
  ];
  return (
    <Stack spacing={1} sx={{ maxWidth: "42em" }}>
      <Typography variant="body2" color="text.secondary">
        <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
          Spoken
        </Box>{" "}
        · {facts.join(" · ")}
      </Typography>
      {recordingUrl && <RecordingPlayer src={recordingUrl} />}
      <Box>
        <Link component="button" type="button" variant="body2" onClick={() => setShowHeard((open) => !open)} aria-expanded={showHeard}>
          {showHeard ? "Hide what the speech model heard" : "What the speech model heard"}
        </Link>
        {showHeard && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {delivery.transcription}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
