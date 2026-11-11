import ArrowForward from "@mui/icons-material/ArrowForward";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import { Alert, Box, Button, Paper, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { usePractiseAgain } from "../api/mutations";
import { useInterview } from "../api/queries";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS, type InterviewSummary } from "../api/types";
import { Speaker } from "./interview/Transcript";
import InterviewHistory from "./InterviewHistory";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const roleLine = (interview: InterviewSummary) => `${interview.roleTitle}${interview.company ? ` · ${interview.company}` : ""}`;

/** The unfinished interview, on the studio band: the one thing a returning candidate most likely came back for. */
function ResumeCard({ interview }: { interview: InterviewSummary }) {
  const next = Math.min(interview.answeredCount + 1, interview.length);
  return (
    <Paper
      sx={{
        bgcolor: "script.studio",
        color: "script.studioInk",
        borderRadius: 2,
        p: { xs: 3, md: 5 },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
        gap: { xs: 3, md: 6 },
        alignItems: "center",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={{ fontWeight: 700, color: "script.studioMuted", mb: 1 }}>
          Pick up where you left off
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: "1.5rem", md: "2rem" },
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            overflowWrap: "anywhere",
          }}
        >
          {roleLine(interview)}
        </Typography>
        <Typography sx={{ color: "script.studioMuted", mt: 1 }}>
          {INTERVIEW_TYPE_LABELS[interview.interviewType]} · {DIFFICULTY_LABELS[interview.difficulty]} · Started{" "}
          {formatDate(interview.createdAt)}
        </Typography>
        <Box
          component="ol"
          aria-label={`${interview.answeredCount} of ${interview.length} questions answered`}
          sx={{ listStyle: "none", p: 0, m: 0, mt: 3, display: "flex", flexWrap: "wrap", gap: 0.75 }}
        >
          {Array.from({ length: interview.length }, (_, index) => {
            const done = index < interview.answeredCount;
            const current = index === interview.answeredCount;
            return (
              <Box
                component="li"
                key={index}
                aria-hidden
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "0.875rem",
                  border: 1,
                  borderColor: done || current ? "script.highlight" : "rgba(255,255,255,0.22)",
                  bgcolor: done ? "script.highlight" : "transparent",
                  color: done ? "script.highlightInk" : current ? "script.highlight" : "script.studioMuted",
                }}
              >
                {done ? <CheckRounded sx={{ fontSize: 18 }} /> : index + 1}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Button
        component={Link}
        to={`/interviews/${interview.id}`}
        size="large"
        endIcon={<ArrowForward />}
        sx={{
          bgcolor: "script.highlight",
          color: "script.highlightInk",
          justifySelf: { xs: "stretch", md: "end" },
          "&:hover": { bgcolor: "script.highlight", filter: "brightness(0.95)" },
        }}
      >
        Resume at question {next}
      </Button>
    </Paper>
  );
}

/** The chart's columns: one per interview, never wider than a comfortable bar. */
const columns = (count: number) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${count}, minmax(0, 56px))`,
  columnGap: 1.5,
});

/** Overall scores over time, oldest to newest: one ink bar per finished interview, the latest on the highlighter. */
function ScoreTrend({ completed }: { completed: InterviewSummary[] }) {
  const runs = [...completed].reverse().slice(-12);
  const latest = runs.at(-1)!;
  const previous = runs.at(-2);
  const best = Math.max(...runs.map((run) => run.overallScore!));
  const change = previous ? latest.overallScore! - previous.overallScore! : null;
  const headline =
    change === null
      ? `Your first score is ${latest.overallScore}/10. Practise again to see how you move.`
      : change > 0
        ? `Up ${change} on your last interview, to ${latest.overallScore}/10.`
        : change < 0
          ? `Down ${-change} on your last interview, to ${latest.overallScore}/10. Your best is ${best}/10.`
          : `Holding at ${latest.overallScore}/10. Your best is ${best}/10.`;

  return (
    <Box component="section" aria-labelledby="scores-heading">
      <Typography id="scores-heading" variant="h6" component="h2">
        Your scores
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {headline}
      </Typography>
      <Box
        role="list"
        aria-label="Overall score for each finished interview, oldest first"
        sx={{ ...columns(runs.length), height: 150, borderBottom: 1, borderColor: "divider" }}
      >
        {runs.map((run) => {
          const isLatest = run === latest;
          const labelled = isLatest || run.overallScore === best;
          const height = Math.max(run.overallScore! * 10, 3);
          return (
            <Tooltip key={run.id} title={`${roleLine(run)} · ${formatDate(run.createdAt)} · ${run.overallScore}/10`} placement="top">
              <Box
                role="listitem"
                aria-label={`${roleLine(run)}, ${formatDate(run.createdAt)}: ${run.overallScore} out of 10`}
                tabIndex={0}
                sx={{ position: "relative", height: "100%", cursor: "default", "&:hover > .bar, &:focus-visible > .bar": { opacity: 0.8 } }}
              >
                {labelled && (
                  <Typography
                    component="span"
                    aria-hidden
                    sx={{ position: "absolute", left: 0, right: 0, bottom: `calc(${height}% + 4px)`, textAlign: "center", fontWeight: 800, fontSize: "0.875rem" }}
                  >
                    {run.overallScore}
                  </Typography>
                )}
                <Box
                  className="bar"
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${height}%`,
                    bgcolor: isLatest ? "script.highlight" : "text.primary",
                    borderRadius: "4px 4px 0 0",
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Box aria-hidden sx={{ ...columns(runs.length), mt: 1 }}>
        {runs.map((run, index) => (
          <Typography key={run.id} variant="caption" color="text.secondary" sx={{ textAlign: "center", whiteSpace: "nowrap" }}>
            {index === runs.length - 1 ? "Latest" : index === 0 ? formatDate(run.createdAt) : ""}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/** The latest report's "what to work on next", so the candidate leaves with something to rehearse. */
function RehearseNext({ interview }: { interview: InterviewSummary }) {
  const full = useInterview(interview.id);
  const practiseAgain = usePractiseAgain();
  const improvements = full.data?.report?.improvements.slice(0, 3) ?? [];

  return (
    <Box component="section" aria-labelledby="rehearse-heading">
      <Typography id="rehearse-heading" variant="h6" component="h2">
        What to rehearse next
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        From your {roleLine(interview)} report, {formatDate(interview.createdAt)}
      </Typography>
      {full.isPending ? (
        <Stack spacing={1}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </Stack>
      ) : improvements.length ? (
        <Stack
          spacing={2}
          sx={{ bgcolor: "script.pencilWash", borderLeft: "1px dashed", borderColor: "script.pencil", borderRadius: 1, p: 2.5 }}
        >
          <Speaker color="script.pencil">Coach</Speaker>
          {improvements.map((item) => (
            <Box key={item.area}>
              <Typography sx={{ fontWeight: 700 }}>{item.area}</Typography>
              <Typography sx={{ color: "script.pencil", lineHeight: 1.6 }}>{item.suggestion}</Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary">Open the report to see how each answer went.</Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: "wrap" }} useFlexGap>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ReplayRounded />}
          disabled={practiseAgain.isPending}
          onClick={() => practiseAgain.mutate(interview.id)}
        >
          Practise this role again
        </Button>
        <Button component={Link} to={`/interviews/${interview.id}`} color="inherit">
          Open report
        </Button>
      </Stack>
      {practiseAgain.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {practiseAgain.error.message}
        </Alert>
      )}
    </Box>
  );
}

/** Home for a candidate who has practised before: their unfinished run, their progress, and what to rehearse next. */
export default function ReturningHome({ interviews }: { interviews: InterviewSummary[] }) {
  const inProgress = interviews.find((interview) => interview.status === "in_progress");
  const completed = interviews.filter((interview) => interview.status === "completed" && interview.overallScore !== null);
  const latestCompleted = completed[0];
  const practised = interviews.filter((interview) => interview.status === "completed").length;

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" } }}
      >
        <Box>
          <Typography variant="h3" component="h1" sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, lineHeight: 1.1 }}>
            Keep rehearsing
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: "1.0625rem" }}>
            {practised === 0
              ? "Finish your first interview to get a coaching report and a score."
              : `${practised} interview${practised === 1 ? "" : "s"} practised. Every run makes the real one easier.`}
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/new"
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
        >
          New interview
        </Button>
      </Stack>

      {inProgress && <ResumeCard interview={inProgress} />}

      {latestCompleted ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
            gap: { xs: 5, md: 7 },
            alignItems: "start",
          }}
        >
          <ScoreTrend completed={completed} />
          <RehearseNext interview={latestCompleted} />
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{ borderColor: "script.rule", borderStyle: "dashed", p: { xs: 2.5, md: 3 }, bgcolor: "transparent" }}
        >
          <Typography sx={{ fontWeight: 700 }}>Your scores and coaching will build up here</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Each finished interview adds a score to your trend and tells you what to rehearse next.
          </Typography>
        </Paper>
      )}

      <InterviewHistory title="All interviews" />
    </Stack>
  );
}
