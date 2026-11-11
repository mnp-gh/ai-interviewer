import FiberManualRecordRounded from "@mui/icons-material/FiberManualRecordRounded";
import KeyboardVoiceRounded from "@mui/icons-material/KeyboardVoiceRounded";
import StopRounded from "@mui/icons-material/StopRounded";
import { Alert, AlertTitle, Box, Button, CircularProgress, Link, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { api, ApiError, recordingUrl } from "../api/client";
import { useSpeechModels } from "../api/queries";
import type { InterviewView, TurnView } from "../api/types";
import ModelSelect from "../components/ModelSelect";
import { RecordingPlayer } from "./DeliveryNote";
import { useDictation } from "./dictation";
import { clock, useRecorder } from "./recorder";

/** The last stretch of a take, when the countdown turns into a warning. */
const WARNING_SECONDS = 15;

type Props = {
  interview: InterviewView;
  /** The question waiting for an answer. */
  turn: TurnView;
  maxSeconds: number;
  /** Another step (sending, feedback) is running. */
  disabled: boolean;
  onInterview: (interview: InterviewView) => void;
  /** A new take was transcribed: its text replaces the answer. */
  onTranscribed: (transcription: string) => void;
  /** The browser's recognition heard more words: they are added to the answer. */
  onDictated: (text: string) => void;
  onRecordingStart: () => void;
};

/**
 * Recording a spoken answer: one take of up to `maxSeconds`, transcribed by the interview's speech
 * model into the answer box for the candidate to check. Recording again replaces the take. When the
 * speech model fails, the candidate can switch speech model, use the browser's own recognition, or type.
 */
export default function SpokenAnswer({ interview, turn, maxSeconds, disabled, onInterview, onTranscribed, onDictated, onRecordingStart }: Props) {
  const { id, setup } = interview;
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  const [dictating, setDictating] = useState(false);
  const [speechChoice, setSpeechChoice] = useState("");
  const lastTake = useRef<Blob | null>(null);
  const speechModels = useSpeechModels();
  const alternatives = speechModels.data?.models.filter((model) => model.id !== setup.speechModelId) ?? [];

  const transcribe = async (audio: Blob) => {
    lastTake.current = audio;
    setUploading(true);
    setFailure(null);
    try {
      const { interview: next } = await api.upload<{ interview: InterviewView }>(`/interviews/${id}/recordings`, audio);
      onInterview(next);
      const pending = next.turns.at(-1)?.pendingRecording;
      if (pending) onTranscribed(pending.transcription);
      lastTake.current = null;
    } catch (error) {
      setFailure(error as Error);
    } finally {
      setUploading(false);
    }
  };

  const recorder = useRecorder(maxSeconds, (audio) => void transcribe(audio));
  const dictation = useDictation(onDictated);

  const record = () => {
    onRecordingStart();
    setFailure(null);
    void recorder.start();
  };

  const discard = async () => {
    try {
      onInterview((await api.delete(`/interviews/${id}/recordings/pending`).then(() => api.get<{ interview: InterviewView }>(`/interviews/${id}`))).interview);
    } catch (error) {
      setFailure(error as Error);
    }
  };

  const switchSpeechModel = async () => {
    try {
      onInterview((await api.put<{ interview: InterviewView }>(`/interviews/${id}/speech-model`, { speechModelId: speechChoice })).interview);
    } catch (error) {
      setFailure(error as Error);
      return;
    }
    if (lastTake.current) void transcribe(lastTake.current);
  };

  const switchToDictation = () => {
    setFailure(null);
    setDictating(true);
  };

  if (dictating) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
          <Button
            variant={dictation.listening ? "contained" : "outlined"}
            color={dictation.listening ? "error" : "inherit"}
            startIcon={dictation.listening ? <StopRounded /> : <KeyboardVoiceRounded />}
            disabled={disabled}
            onClick={dictation.listening ? dictation.stop : () => { onRecordingStart(); dictation.start(); }}
          >
            {dictation.listening ? "Stop dictating" : "Dictate with my browser"}
          </Button>
          <Link component="button" type="button" variant="body2" onClick={() => { dictation.stop(); setDictating(false); }}>
            Back to recording
          </Link>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Your browser types what you say into the answer below. Nothing is recorded, so how you said it isn't scored for this answer.
        </Typography>
        {dictation.error && <Alert severity="error">{dictation.error}</Alert>}
      </Stack>
    );
  }

  const pending = turn.pendingRecording;
  const recording = recorder.state !== "idle";
  const left = maxSeconds - recorder.elapsed;
  const warning = recording && left <= WARNING_SECONDS;
  const modelProblem = failure instanceof ApiError && failure.code === "MODEL_UNAVAILABLE";

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
        {recording ? (
          <Button variant="contained" color="error" size="large" startIcon={<StopRounded />} onClick={recorder.stop} disabled={recorder.state === "starting"}>
            Stop recording
          </Button>
        ) : (
          <Button
            variant={pending ? "outlined" : "contained"}
            color={pending ? "inherit" : "primary"}
            size="large"
            startIcon={<FiberManualRecordRounded sx={{ color: pending ? "error.main" : undefined }} />}
            onClick={record}
            disabled={disabled || uploading}
          >
            {pending ? "Record again" : "Record my answer"}
          </Button>
        )}
        {recording ? (
          <Typography
            role="timer"
            aria-live={warning ? "assertive" : "off"}
            sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: warning ? "error.main" : "text.primary" }}
          >
            {clock(recorder.elapsed)} / {clock(maxSeconds)}
            {warning && ` · ${Math.max(0, Math.ceil(left))} seconds left`}
          </Typography>
        ) : uploading ? (
          <Stack direction="row" spacing={1} role="status" sx={{ alignItems: "center" }}>
            <CircularProgress size={18} color="inherit" />
            <Typography sx={{ fontWeight: 600 }}>Transcribing…</Typography>
          </Stack>
        ) : pending ? (
          <Typography variant="body2" color="text.secondary">
            Recorded {clock(pending.durationSeconds)}.{" "}
            <Link component="button" type="button" variant="body2" onClick={() => void discard()} disabled={disabled}>
              Discard it
            </Link>
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Up to {clock(maxSeconds)}, in one take. Or type your answer below.
          </Typography>
        )}
      </Stack>

      {pending && !recording && !uploading && (
        <>
          {pending.recordingId ? (
            <RecordingPlayer src={recordingUrl(id, pending.recordingId)!} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              Recording storage is full, so this take's audio isn't kept. It's still transcribed and judged.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Check the text below and fix anything misheard. How you said it is judged from the recording; what you said, from the text you send.
          </Typography>
        </>
      )}

      {recorder.error && <Alert severity="error">{recorder.error}</Alert>}

      {failure && (
        <Alert severity={modelProblem ? "warning" : "error"} sx={{ "& .MuiAlert-message": { width: "100%" } }}>
          <AlertTitle>{modelProblem ? "The speech model is busy" : "Your recording couldn't be transcribed"}</AlertTitle>
          {failure.message}
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {lastTake.current && (
              <Box>
                <Button variant="outlined" color="inherit" size="small" disabled={uploading} onClick={() => void transcribe(lastTake.current!)}>
                  Try again
                </Button>
              </Box>
            )}
            {modelProblem && alternatives.length > 0 && lastTake.current && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                <Box sx={{ flexGrow: 1, maxWidth: 420 }}>
                  <ModelSelect models={alternatives} value={speechChoice} onChange={setSpeechChoice} label="Or switch speech model" />
                </Box>
                <Button variant="contained" size="small" disabled={!speechChoice || uploading} onClick={() => void switchSpeechModel()}>
                  Switch and transcribe
                </Button>
              </Stack>
            )}
            <Typography variant="body2">
              {dictation.supported && (
                <>
                  <Link component="button" type="button" variant="body2" onClick={switchToDictation}>
                    Use my browser's speech recognition
                  </Link>{" "}
                  (not scored for delivery), or type{" "}
                </>
              )}
              {!dictation.supported && "Or type "}
              your answer below.
            </Typography>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
