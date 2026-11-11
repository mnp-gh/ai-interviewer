import { useCallback, useEffect, useRef, useState } from "react";

// Speech needs little: 16 kbps Opus is clear and keeps recordings small in the free database (ADR 0011).
const BITS_PER_SECOND = 16_000;
// In order of preference; Safari records MP4 (AAC) only.
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"];

export const recordingSupported = () =>
  typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

const pickType = () => TYPES.find((type) => MediaRecorder.isTypeSupported(type));

/** A short message for a microphone that couldn't be opened. */
export function microphoneProblem(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow it in your browser's site settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found. Plug one in, then try again.";
  if (name === "NotReadableError") return "Your microphone is in use by another app. Close it, then try again.";
  return "Your microphone couldn't be opened. Check it, then try again.";
}

export const openMicrophone = () =>
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });

export type RecorderState = "idle" | "starting" | "recording";

/**
 * Records one take from the microphone. Stops on its own after `maxSeconds`, then hands the audio to
 * `onRecorded`. `cancel` stops without handing anything over.
 */
export function useRecorder(maxSeconds: number, onRecorded: (audio: Blob, seconds: number) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<{ recorder: MediaRecorder; stream: MediaStream; timer: number; startedAt: number; keep: boolean } | null>(null);
  const deliver = useRef(onRecorded);
  deliver.current = onRecorded;

  const finish = useCallback((keep: boolean) => {
    const current = session.current;
    if (!current) return;
    current.keep = keep;
    window.clearInterval(current.timer);
    if (current.recorder.state !== "inactive") current.recorder.stop();
    else current.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const start = useCallback(async () => {
    if (session.current) return;
    setError(null);
    setElapsed(0);
    setState("starting");
    let stream: MediaStream;
    try {
      stream = await openMicrophone();
    } catch (problem) {
      setError(microphoneProblem(problem));
      setState("idle");
      return;
    }
    const mimeType = pickType();
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: BITS_PER_SECOND });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const current = session.current;
      session.current = null;
      stream.getTracks().forEach((track) => track.stop());
      setState("idle");
      if (!current?.keep) return;
      const seconds = (performance.now() - current.startedAt) / 1000;
      deliver.current(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }), seconds);
    };
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const seconds = (performance.now() - startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSeconds) finish(true);
    }, 250);
    session.current = { recorder, stream, timer, startedAt, keep: true };
    recorder.start(1000);
    setState("recording");
  }, [finish, maxSeconds]);

  // Leaving the page mid-take discards it.
  useEffect(() => () => finish(false), [finish]);

  return { state, elapsed, error, start, stop: () => finish(true), cancel: () => finish(false) };
}

/** 75 -> "1:15". */
export const clock = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
