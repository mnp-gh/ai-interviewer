import { Box, Stack, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import type { ReactNode } from "react";
import type { TurnView } from "../../api/types";

const blink = keyframes`50% { opacity: 0; }`;

/** A blinking caret shown at the end of text that is still streaming. */
export function Caret() {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-block",
        width: "2px",
        height: "1.1em",
        ml: 0.5,
        mb: "-0.2em",
        bgcolor: "text.primary",
        animation: `${blink} 1s step-end infinite`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    />
  );
}

/** A speaker's name, set like a character name in a script. */
export function Speaker({ children, color = "text.secondary" }: { children: ReactNode; color?: string }) {
  return (
    <Typography
      component="div"
      sx={{
        fontSize: "0.75rem",
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

/** The interviewer's cue: the question, set large; long questions step down so they don't become a wall. */
export const QuestionBubble = ({ index, children }: { index: number; children: ReactNode }) => {
  const long = typeof children === "string" && children.length > 140;
  return (
    <Box>
      <Speaker>Interviewer · Question {index + 1}</Speaker>
      <Typography
        component="div"
        sx={{
          fontSize: long ? { xs: "1.0625rem", md: "1.1875rem" } : { xs: "1.1875rem", md: "1.375rem" },
          lineHeight: long ? 1.5 : 1.4,
          fontWeight: long ? 600 : 700,
          letterSpacing: "-0.005em",
          maxWidth: "40em",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
};

/** The candidate's line. */
export const AnswerBubble = ({ label = "You", children }: { label?: string; children: ReactNode }) => (
  <Box>
    <Speaker color="text.primary">{label}</Speaker>
    <Typography component="div" sx={{ fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "42em", whiteSpace: "pre-wrap" }}>
      {children}
    </Typography>
  </Box>
);

/** The candidate's question to the coach. */
export const CoachQuestionBubble = ({ children }: { children: ReactNode }) => (
  <Box>
    <Speaker>You · to the coach</Speaker>
    <Typography component="div" sx={{ fontSize: "0.9375rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
      {children}
    </Typography>
  </Box>
);

/** The coach's note, written in director's pencil. */
export const FeedbackBubble = ({ children }: { children: ReactNode }) => (
  <Box>
    <Speaker color="script.pencil">Coach</Speaker>
    <Typography component="div" sx={{ fontSize: "0.9375rem", lineHeight: 1.65, color: "script.pencil", whiteSpace: "pre-wrap" }}>
      {children}
    </Typography>
  </Box>
);

/** The coach's notes on a line: pencilled under it, behind a dashed rule, at reading width. */
export function CoachNotes({ children }: { children: ReactNode }) {
  return (
    <Stack
      spacing={2}
      sx={{
        maxWidth: "42em",
        bgcolor: "script.pencilWash",
        borderLeft: "1px dashed",
        borderColor: "script.pencil",
        borderRadius: 1,
        px: { xs: 2, sm: 2.5 },
        py: 2,
      }}
    >
      {children}
    </Stack>
  );
}

/** A line and, when there are any, the coach's notes under it. */
export function ScriptRow({ line, notes }: { line: ReactNode; notes?: ReactNode }) {
  return (
    <Stack spacing={2}>
      {line}
      {notes && <CoachNotes>{notes}</CoachNotes>}
    </Stack>
  );
}

/** One question with every attempt at it, each attempt's feedback, and the coach chat that followed it. */
export function TurnTranscript({
  turn,
  showCoaching,
  hideQuestion = false,
}: {
  turn: TurnView;
  showCoaching: boolean;
  /** For when the question is already shown above, as in the report. */
  hideQuestion?: boolean;
}) {
  const attempts = [...turn.previousAttempts, ...(turn.answer ? [{ answer: turn.answer, feedback: turn.feedback }] : [])];
  const numbered = turn.previousAttempts.length > 0;
  return (
    <Stack spacing={3}>
      {!hideQuestion && <QuestionBubble index={turn.index}>{turn.question}</QuestionBubble>}
      {attempts.map((attempt, index) => {
        const chat = showCoaching ? turn.coachMessages.filter((message) => message.attempt === index) : [];
        const hasNotes = showCoaching && (attempt.feedback || chat.length > 0);
        return (
          <ScriptRow
            key={index}
            line={<AnswerBubble label={numbered ? `You · Attempt ${index + 1}` : "You"}>{attempt.answer}</AnswerBubble>}
            notes={
              hasNotes ? (
                <>
                  {attempt.feedback && <FeedbackBubble>{attempt.feedback}</FeedbackBubble>}
                  {chat.map((message, i) =>
                    message.role === "candidate" ? (
                      <CoachQuestionBubble key={i}>{message.content}</CoachQuestionBubble>
                    ) : (
                      <FeedbackBubble key={i}>{message.content}</FeedbackBubble>
                    ),
                  )}
                </>
              ) : undefined
            }
          />
        );
      })}
    </Stack>
  );
}
