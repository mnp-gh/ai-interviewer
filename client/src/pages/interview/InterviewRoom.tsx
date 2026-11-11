import CheckRounded from "@mui/icons-material/CheckRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import FlagRounded from "@mui/icons-material/FlagRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import VolumeOffRounded from "@mui/icons-material/VolumeOffRounded";
import VolumeUpRounded from "@mui/icons-material/VolumeUpRounded";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keyframes, type Theme } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api/client";
import { rememberInterview, useModels, useSpeechModels } from "../../api/queries";
import {
  DIFFICULTY_LABELS,
  INTERVIEW_TYPE_LABELS,
  MAX_ANSWER_CHARS,
  MAX_COACH_MESSAGE_CHARS,
  MAX_COACH_MESSAGES,
  MAX_RETRIES,
  MODE_LABELS,
  type InterviewView,
  type TurnView,
} from "../../api/types";
import { useInterviewerVoice } from "../../voice/interviewerVoice";
import SpokenAnswer from "../../voice/SpokenAnswer";
import ErrorPanel from "./ErrorPanel";
import {
  AnswerBubble,
  Caret,
  CoachQuestionBubble,
  FeedbackBubble,
  QuestionBubble,
  ScriptRow,
  Speaker,
  TurnTranscript,
} from "./Transcript";

type Action = "question" | "answer" | "feedback" | "coach" | "retry" | "end";
type SceneState = "done" | "current" | "upcoming";

/** A question's opening words, for the scene list; the full text is in the script. */
const shorten = (text: string) => (text.length > 42 ? `${text.slice(0, 40).trimEnd()}…` : text);

/**
 * The run-through as numbered scenes: done, current (highlighted) and still to come. A rail on wide
 * screens, a strip on narrow ones; each asked scene links to its place in the script.
 */
function SceneList({
  turns,
  length,
  current,
  onSelect,
}: {
  turns: TurnView[];
  length: number;
  current: number;
  /** Opens an earlier question before the link scrolls to it. */
  onSelect: (index: number) => void;
}) {
  const scenes = Array.from({ length }, (_, index) => {
    const turn = turns[index];
    const answered = Boolean(turn && (turn.answer || turn.previousAttempts.length));
    const state: SceneState = index === current - 1 ? "current" : answered ? "done" : "upcoming";
    return { index, turn, state };
  });
  return (
    <Box
      component="ol"
      aria-label="Questions"
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        display: "flex",
        flexDirection: { xs: "row", md: "column" },
        gap: { xs: 0.75, md: 0.25 },
        overflowX: { xs: "auto", md: "visible" },
        pb: { xs: 0.5, md: 0 },
      }}
    >
      {scenes.map(({ index, turn, state }) => {
        const content = (
          <>
            <Box
              component="span"
              sx={{ width: 22, flexShrink: 0, fontWeight: 800, textAlign: { md: "right" }, display: "inline-flex", justifyContent: "center" }}
            >
              {state === "done" ? <CheckRounded sx={{ fontSize: 18 }} aria-label="Answered" /> : index + 1}
            </Box>
            <Box
              component="span"
              sx={{ display: { xs: "none", md: "block" }, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {turn ? shorten(turn.question) : "Not asked yet"}
            </Box>
          </>
        );
        const sx = {
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: { xs: 1.25, md: 1 },
          py: 0.75,
          minHeight: 36,
          borderRadius: 1,
          fontSize: "0.875rem",
          color: state === "upcoming" ? "text.secondary" : "text.primary",
          textDecoration: "none",
          flexShrink: 0,
          border: { xs: 1, md: 0 },
          borderColor: "divider",
          ...(state === "current" && {
            backgroundImage: (theme: Theme) =>
              `linear-gradient(${theme.vars!.palette.script.highlight}, ${theme.vars!.palette.script.highlight})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 100%",
            animation: `${sweep} 420ms cubic-bezier(0.22, 1, 0.36, 1)`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            color: "script.highlightInk",
            fontWeight: 700,
            borderColor: "transparent",
          }),
        } as const;
        return (
          <li key={index} aria-current={state === "current" ? "step" : undefined}>
            {turn ? (
              <Box component="a" href={`#scene-${index}`} title={turn.question} onClick={() => onSelect(index)} sx={{ ...sx, "&:hover": state === "current" ? {} : { bgcolor: "action.hover" } }}>
                {content}
              </Box>
            ) : (
              <Box sx={sx}>{content}</Box>
            )}
          </li>
        );
      })}
    </Box>
  );
}

/** An answered question folded to one line; opens to its full transcript. */
function FoldButton({ index, question, open, onToggle }: { index: number; question: string; open: boolean; onToggle: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        width: "100%",
        py: 0.5,
        borderRadius: 1,
        color: "text.secondary",
        "&:hover": { color: "text.primary" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: 2 },
      }}
    >
      <CheckRounded sx={{ fontSize: 18, flexShrink: 0 }} />
      <Typography component="span" sx={{ fontWeight: 600, flexShrink: 0, color: "text.primary" }}>
        Question {index + 1}
      </Typography>
      <Typography component="span" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
        {open ? "" : question}
      </Typography>
      <Typography component="span" variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
        {open ? "Hide" : "Show"}
      </Typography>
      <ExpandMoreRounded sx={{ fontSize: 20, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease-out" }} />
    </Box>
  );
}

const SEND_KEYS = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ + Enter" : "Ctrl + Enter";

/** The highlighter drawn across the current scene when it changes. */
const sweep = keyframes`from { background-size: 0% 100%; } to { background-size: 100% 100%; }`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isConflict = (error: unknown) => error instanceof ApiError && error.code === "CONFLICT";


/** The unsent answer for a question, kept per tab so a refresh doesn't lose it. */
function useAnswerDraft(key: string) {
  const [value, setValue] = useState(() => {
    try {
      return sessionStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      setValue(sessionStorage.getItem(key) ?? "");
    } catch {
      setValue("");
    }
  }, [key]);
  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        if (next) sessionStorage.setItem(key, next);
        else sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
    [key]
  );
  return [value, update] as const;
}

export default function InterviewRoom({ interview }: { interview: InterviewView }) {
  const queryClient = useQueryClient();
  const models = useModels();
  const { id, setup, turns } = interview;
  const last = turns.at(-1);
  // A question reopened for another attempt still counts: its earlier attempt stands until replaced.
  const answeredCount = turns.filter((turn) => turn.answer || turn.previousAttempts.length).length;
  const coach = setup.mode === "coach";
  const spoken = setup.voice === "spoken";
  const speechModels = useSpeechModels();
  const maxRecordingSeconds = speechModels.data?.maxRecordingSeconds ?? 120;
  const speechModelLabel = speechModels.data?.models.find((model) => model.id === setup.speechModelId)?.label ?? setup.speechModelId;
  const voice = useInterviewerVoice(spoken, id, speechModels.data?.interviewerVoices ?? []);

  const [busy, setBusy] = useState<Action | null>(null);
  const [streamText, setStreamText] = useState("");
  const [sentAnswer, setSentAnswer] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ action: Action; error: Error } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [coachDraft, setCoachDraft] = useState("");
  // Earlier questions fold away so the current one has the page; the candidate can reopen any of them.
  const [openTurns, setOpenTurns] = useState<Set<number>>(() => new Set());
  const toggleTurn = (index: number, open?: boolean) =>
    setOpenTurns((current) => {
      const next = new Set(current);
      if (open ?? !next.has(index)) next.add(index);
      else next.delete(index);
      return next;
    });
  const [sentCoachMessage, setSentCoachMessage] = useState<string | null>(null);
  const [answer, setAnswer] = useAnswerDraft(`ai-interviewer.answer.${id}.${turns.length}`);
  const bottom = useRef<HTMLDivElement>(null);

  const waitingForAnswer = Boolean(last && !last.answer);
  const allAnswered = turns.length >= setup.length && Boolean(last?.answer);
  const feedbackMissing = coach && Boolean(last?.answer) && !last?.feedback;
  const coachQuestionsLeft = MAX_COACH_MESSAGES - (last?.coachMessages.filter((m) => m.role === "candidate").length ?? 0);
  const retriesLeft = MAX_RETRIES - (last?.previousAttempts.length ?? 0);
  const canCoach = coach && Boolean(last?.answer && last.feedback);
  const modelLabel = models.data?.find((model) => model.id === setup.modelId)?.label ?? setup.modelId;

  const save = useCallback((next: InterviewView) => rememberInterview(queryClient, next), [queryClient]);

  /** Runs one step, streaming its text, and records a failure for the error panel. */
  const run = useCallback(
    async (action: Action, work: (onDelta: (text: string) => void) => Promise<InterviewView>) => {
      setBusy(action);
      setFailure(null);
      setStreamText("");
      try {
        const next = await work((text) => setStreamText((current) => current + text));
        save(next);
        return next;
      } catch (error) {
        setFailure({ action, error: error as Error });
        return null;
      } finally {
        setBusy(null);
        setStreamText("");
      }
    },
    [save]
  );

  const askQuestion = useCallback(
    () =>
      run("question", async (onDelta) => {
        // Another tab or an earlier request may still be generating it: wait for that one to land.
        for (let attempt = 0; ; attempt++) {
          try {
            return await api.stream(`/interviews/${id}/questions`, {}, onDelta);
          } catch (error) {
            if (!isConflict(error) || attempt >= 20) throw error;
            await sleep(2500);
            const { interview: latest } = await api.get<{ interview: InterviewView }>(`/interviews/${id}`);
            const waiting = latest.turns.at(-1);
            if (latest.status !== "in_progress" || (waiting && !waiting.answer)) return latest;
          }
        }
      }),
    [id, run]
  );

  const submitAnswer = async () => {
    const text = answer.trim();
    if (!text) return;
    setSentAnswer(text);
    voice.stop();
    // With an unsent recording, the text is its transcription as corrected: content is judged from it, delivery from the recording.
    const fromRecording = Boolean(last?.pendingRecording);
    const next = await run("answer", (onDelta) =>
      api.stream(`/interviews/${id}/answers`, { answer: text, ...(fromRecording ? { spoken: true } : {}) }, onDelta)
    );
    setSentAnswer(null);
    if (next) setAnswer("");
  };

  const retryFeedback = () => run("feedback", (onDelta) => api.stream(`/interviews/${id}/feedback`, {}, onDelta));

  const askCoach = async (message = coachDraft.trim()) => {
    if (!message) return;
    setSentCoachMessage(message);
    const next = await run("coach", (onDelta) => api.stream(`/interviews/${id}/coach`, { message }, onDelta));
    if (next) {
      setSentCoachMessage(null);
      setCoachDraft("");
    }
  };

  const answerAgain = () =>
    run("retry", async () => (await api.post<{ interview: InterviewView }>(`/interviews/${id}/retry`)).interview);

  const end = () => {
    setConfirmEnd(false);
    void run("end", async () => (await api.post<{ interview: InterviewView }>(`/interviews/${id}/end`)).interview);
  };

  const retry = (action: Action) => {
    if (action === "question") void askQuestion();
    else if (action === "answer") void submitAnswer();
    else if (action === "feedback") void retryFeedback();
    else if (action === "coach") void askCoach(sentCoachMessage ?? undefined);
    else if (action === "retry") void answerAgain();
    else end();
  };

  const switchModel = async (modelId: string) => {
    if (!failure) return;
    const action = failure.action;
    try {
      save((await api.put<{ interview: InterviewView }>(`/interviews/${id}/model`, { modelId })).interview);
    } catch (error) {
      setFailure({ action, error: error as Error });
      return;
    }
    retry(action);
  };

  // Ask automatically at the start, and between questions in mock mode (like a real interview).
  const autoAskedAt = useRef<number | null>(null);
  const shouldAutoAsk =
    interview.status === "in_progress" &&
    !busy &&
    !failure &&
    turns.length < setup.length &&
    (turns.length === 0 || (!coach && Boolean(last?.answer)));
  useEffect(() => {
    if (shouldAutoAsk && autoAskedAt.current !== turns.length) {
      autoAskedAt.current = turns.length;
      void askQuestion();
    }
  }, [shouldAutoAsk, turns.length, askQuestion]);

  // A spoken interview's questions are read aloud once each has fully arrived: one utterance flows
  // better than sentence by sentence, as some voices pause before each one.
  const { sayQuestion } = voice;
  // The last question read out. One already waiting when the page opens isn't read unasked.
  const readIndex = useRef<number | null>(last && !last.answer ? last.index : null);
  // Held until the voices are known, so the first question isn't read by the fallback voice.
  const voicesKnown = !spoken || !speechModels.isPending;
  useEffect(() => {
    if (!voicesKnown || !last || last.answer || busy === "question") return;
    if (readIndex.current !== null && readIndex.current >= last.index) return;
    readIndex.current = last.index;
    void sayQuestion(last.question, last.index);
  }, [busy, last, sayQuestion, voicesKnown]);

  // After a reload, an unsent recording's transcription comes back into an empty answer box.
  const pendingTranscription = last && !last.answer ? last.pendingRecording?.transcription : undefined;
  useEffect(() => {
    if (pendingTranscription && !answer) setAnswer(pendingTranscription);
    // Only when the recording changes, so the candidate can clear the box on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTranscription]);

  const streaming = streamText.length > 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, streaming, busy, sentAnswer, last?.coachMessages.length]);

  // The question on screen: the one streaming in, the one waiting for an answer, or the last one answered.
  const currentNumber = busy === "question" ? turns.length + 1 : waitingForAnswer ? turns.length : answeredCount;


  const header = (
    <Box>
      <Typography variant="h5" component="h1" sx={{ lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {setup.requirements.title}
        {setup.requirements.company && (
          <Box component="span" sx={{ display: "block", color: "text.secondary", fontWeight: 600, fontSize: "1rem", mt: 0.5 }}>
            {setup.requirements.company}
          </Box>
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
        {INTERVIEW_TYPE_LABELS[setup.interviewType]} · {DIFFICULTY_LABELS[setup.difficulty]} · {MODE_LABELS[setup.mode].label} mode
        <br />
        Interviewer: {modelLabel}
        {spoken && (
          <>
            <br />
            Spoken answers · {speechModelLabel}
          </>
        )}
      </Typography>
    </Box>
  );

  const endButton = (
    <Button
      variant="outlined"
      color="inherit"
      size="small"
      startIcon={<FlagRounded />}
      disabled={!answeredCount || busy !== null}
      onClick={() => (allAnswered ? end() : setConfirmEnd(true))}
    >
      End interview
    </Button>
  );

  const nextSteps = !busy && !failure && !waitingForAnswer && last?.answer && (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap sx={{ alignItems: { sm: "center" }, flexWrap: "wrap" }}>
      {allAnswered ? (
        <Button variant="contained" onClick={end}>
          Finish and see my report
        </Button>
      ) : (
        coach && (
          <Button variant="contained" onClick={() => void askQuestion()}>
            Next question
          </Button>
        )
      )}
      {coach && retriesLeft > 0 && (
        <Button variant="outlined" color="inherit" startIcon={<ReplayRounded />} onClick={() => void answerAgain()}>
          Try answering again ({retriesLeft} left)
        </Button>
      )}
      {feedbackMissing && <Button onClick={() => void retryFeedback()}>Get feedback on this answer</Button>}
    </Stack>
  );

  // One quiet line under the coach's notes: a question to the coach is optional, so it never competes with the next step.
  const coachBox = canCoach && !busy && coachQuestionsLeft > 0 && (
    <Box sx={{ maxWidth: "42em" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          size="small"
          multiline
          maxRows={6}
          value={coachDraft}
          onChange={(event) => setCoachDraft(event.target.value.slice(0, MAX_COACH_MESSAGE_CHARS))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void askCoach();
            }
          }}
          placeholder="Ask the coach, e.g. what would a strong answer sound like?"
          slotProps={{ htmlInput: { "aria-label": "Message to the coach" } }}
        />
        <Button
          variant="outlined"
          color="secondary"
          endIcon={<SendRounded />}
          disabled={!coachDraft.trim()}
          onClick={() => void askCoach()}
          sx={{ flexShrink: 0, minHeight: 40 }}
        >
          Ask
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        {coachQuestionsLeft} of {MAX_COACH_MESSAGES} questions left. Not scored, and the interviewer doesn't see it.
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "240px minmax(0, 1fr)" },
        gap: { xs: 2.5, md: 4 },
        alignItems: "start",
      }}
    >
      <Stack spacing={3} sx={{ position: { md: "sticky" }, top: { md: 92 }, minWidth: 0 }}>
        {header}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            {currentNumber ? `Question ${currentNumber} of ${setup.length}` : `${setup.length} questions`}
            <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
              {" "}· {answeredCount} answered
            </Box>
          </Typography>
          <SceneList
            turns={turns}
            length={setup.length}
            current={interview.status === "in_progress" ? currentNumber : 0}
            onSelect={(index) => toggleTurn(index, true)}
          />
        </Box>
        <Box>{endButton}</Box>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ borderColor: "script.rule", px: { xs: 2.5, sm: 4, md: 6 }, py: { xs: 3, md: 5 }, minWidth: 0 }}
      >
        <Stack spacing={4} aria-live="polite" divider={<Divider flexItem sx={{ borderColor: "script.rule" }} />}>
          {turns.length > 1 && (
            <Stack spacing={1}>
              {turns.slice(0, -1).map((turn) => {
                const open = openTurns.has(turn.index);
                return (
                  <Stack key={turn.index} id={`scene-${turn.index}`} spacing={3} sx={{ scrollMarginTop: 96, pb: open ? 3 : 0 }}>
                    <FoldButton index={turn.index} question={turn.question} open={open} onToggle={() => toggleTurn(turn.index)} />
                    {open && <TurnTranscript turn={turn} interviewId={id} showCoaching={coach} />}
                  </Stack>
                );
              })}
            </Stack>
          )}

          {last && (
            <Stack id={`scene-${last.index}`} spacing={3} sx={{ scrollMarginTop: 96 }}>
                <TurnTranscript turn={last} interviewId={id} showCoaching={coach} />
                {busy === "answer" && sentAnswer && (
                  <ScriptRow
                    line={
                      <AnswerBubble label={last?.previousAttempts.length ? `You · Attempt ${last.previousAttempts.length + 1}` : "You"}>
                        {sentAnswer}
                      </AnswerBubble>
                    }
                    notes={
                      coach ? (
                        <FeedbackBubble>
                          {streamText || "Reviewing your answer…"}
                          <Caret />
                        </FeedbackBubble>
                      ) : undefined
                    }
                  />
                )}
                {busy === "feedback" && coach && (
                  <ScriptRow
                    line={null}
                    notes={
                      <FeedbackBubble>
                        {streamText || "Reviewing your answer…"}
                        <Caret />
                      </FeedbackBubble>
                    }
                  />
                )}
                {busy === "coach" && sentCoachMessage && (
                  <ScriptRow
                    line={null}
                    notes={
                      <>
                        <CoachQuestionBubble>{sentCoachMessage}</CoachQuestionBubble>
                        <FeedbackBubble>
                          {streamText || "Thinking…"}
                          <Caret />
                        </FeedbackBubble>
                      </>
                    }
                  />
                )}
                {coachBox}
              {nextSteps && <Box sx={{ pt: 1 }}>{nextSteps}</Box>}
              </Stack>
          )}

          {busy === "question" && (
            <QuestionBubble index={turns.length}>
              {streamText || (
                <Typography component="span" color="text.secondary" sx={{ font: "inherit" }}>
                  Thinking of a question…
                </Typography>
              )}
              <Caret />
            </QuestionBubble>
          )}

          {busy === "answer" && !coach && (
            <Typography color="text.secondary">Answer saved. The next question is on its way.</Typography>
          )}

          {busy === "end" && (
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", py: 1 }}>
              <CircularProgress size={22} color="inherit" />
              <Typography sx={{ fontWeight: 600 }}>Writing your report…</Typography>
            </Stack>
          )}

          {failure && (
            <ErrorPanel
              error={failure.error}
              currentModelId={setup.modelId}
              busy={busy !== null}
              onRetry={() => retry(failure.action)}
              onSwitchModel={(modelId) => void switchModel(modelId)}
            />
          )}

          {waitingForAnswer && busy !== "answer" && (
            <Box>
              <Speaker color="text.primary">
                {last?.previousAttempts.length ? `You · Attempt ${last.previousAttempts.length + 1}` : "You"}
              </Speaker>
              {spoken && last && (
                <Stack spacing={2} sx={{ mb: 2.5 }}>
                  {voice.supported && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }} useFlexGap>
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<VolumeUpRounded />}
                        disabled={voice.muted}
                        onClick={() => void voice.sayQuestion(last.question, last.index)}
                      >
                        Hear the question again
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={voice.muted ? <VolumeOffRounded /> : <VolumeUpRounded />}
                        aria-pressed={voice.muted}
                        onClick={() => voice.setMuted(!voice.muted)}
                      >
                        {voice.muted ? "Interviewer muted" : "Mute the interviewer"}
                      </Button>
                      {voice.options.length > 1 && !voice.muted && (
                        <TextField
                          select
                          size="small"
                          label="Interviewer's voice"
                          value={voice.selected?.key ?? ""}
                          onChange={(event) => voice.choose(event.target.value, { text: last.question, index: last.index })}
                          sx={{ minWidth: 220 }}
                        >
                          {voice.options.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Stack>
                  )}
                  {voice.fallback && voice.selected?.enhanced && !voice.muted && (
                    <Typography variant="body2" color="text.secondary">
                      {voice.fallback}
                    </Typography>
                  )}
                  <SpokenAnswer
                    interview={interview}
                    turn={last}
                    maxSeconds={maxRecordingSeconds}
                    disabled={busy !== null}
                    onInterview={save}
                    onTranscribed={setAnswer}
                    onDictated={(text) => setAnswer(answer ? `${answer.trimEnd()} ${text}` : text)}
                    onRecordingStart={voice.stop}
                  />
                </Stack>
              )}
              <TextField
                multiline
                minRows={6}
                maxRows={18}
                value={answer}
                onChange={(event) => setAnswer(event.target.value.slice(0, MAX_ANSWER_CHARS))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submitAnswer();
                }}
                placeholder={
                  spoken
                    ? "Your recorded answer appears here to check. Or type this one instead."
                    : last?.previousAttempts.length
                      ? "Try again, using the feedback. Your best attempt counts in the report."
                      : "Answer as you would out loud. Specific examples and results make the strongest answers."
                }
                autoFocus={!spoken}
                slotProps={{
                  htmlInput: { "aria-label": "Your answer" },
                  input: { sx: { fontSize: "1.0625rem", lineHeight: 1.7 } },
                }}
              />
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 2, gap: 2 }}>
                {answer.length > MAX_ANSWER_CHARS * 0.9 ? (
                  <Typography variant="caption" color="text.secondary">
                    {answer.length}/{MAX_ANSWER_CHARS}
                  </Typography>
                ) : (
                  // Phones have no shortcut keys, so the hint only shows where a keyboard is likely.
                  <Typography variant="caption" color="text.secondary" sx={{ visibility: { xs: "hidden", sm: "visible" } }}>
                    {SEND_KEYS} to submit
                  </Typography>
                )}
                <Button
                  variant="contained"
                  size="large"
                  disabled={!answer.trim() || busy !== null}
                  onClick={() => void submitAnswer()}
                >
                  Submit answer
                </Button>
              </Stack>
            </Box>
          )}

          {!coach && interview.status === "in_progress" && (
            <Typography variant="body2" color="text.secondary">
              Mock mode: feedback on each answer is saved for your report.
            </Typography>
          )}
        </Stack>
        <div ref={bottom} />
      </Paper>

      <Dialog open={confirmEnd} onClose={() => setConfirmEnd(false)}>
        <DialogTitle>End the interview now?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You've answered {answeredCount} of {setup.length} questions. Your report will cover only those
            {waitingForAnswer ? ", and the current unanswered question will be dropped" : ""}.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEnd(false)}>Keep going</Button>
          <Button variant="contained" onClick={end}>
            End and see report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
