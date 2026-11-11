import MicRounded from "@mui/icons-material/MicRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { microphoneProblem, openMicrophone, recordingSupported } from "./recorder";

type Status = "idle" | "asking" | "ready" | "failed";

/**
 * Asks for the microphone at setup and shows a live level, so a blocked or silent mic is found before
 * the interview, not at question 1. Reports whether the microphone works.
 */
export default function MicCheck({ onReady }: { onReady: (ready: boolean) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const meter = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  if (!recordingSupported()) {
    return <Alert severity="warning">This browser can't record audio. Choose typed answers, or use a recent Chrome, Edge, Firefox or Safari.</Alert>;
  }

  const check = async () => {
    setStatus("asking");
    setProblem(null);
    let stream: MediaStream;
    try {
      stream = await openMicrophone();
    } catch (error) {
      setProblem(microphoneProblem(error));
      setStatus("failed");
      onReady(false);
      return;
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
      // A transform, not a width: it animates without layout.
      if (meter.current) meter.current.style.transform = `scaleX(${Math.min(1, (peak / 128) * 2.5)})`;
      frame = requestAnimationFrame(draw);
    };
    draw();
    cleanup.current = () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    };
    setStatus("ready");
    onReady(true);
  };

  if (status === "ready") {
    return (
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Microphone ready. Say something: the bar should move.
        </Typography>
        <Box sx={{ height: 8, maxWidth: 320, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }} aria-hidden>
          <Box ref={meter} sx={{ height: "100%", bgcolor: "script.highlight", transformOrigin: "left", transform: "scaleX(0)" }} />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
      {problem && <Alert severity="error">{problem}</Alert>}
      <Button variant="outlined" color="inherit" startIcon={<MicRounded />} disabled={status === "asking"} onClick={() => void check()}>
        {status === "failed" ? "Try the microphone again" : "Check my microphone"}
      </Button>
      <Typography variant="body2" color="text.secondary">
        Your browser will ask to use the microphone. Spoken answers need it.
      </Typography>
    </Stack>
  );
}
