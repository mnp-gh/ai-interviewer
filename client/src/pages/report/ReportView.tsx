import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ReplayRounded from "@mui/icons-material/ReplayRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useModels } from "../../api/queries";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS, MODE_LABELS, type InterviewView } from "../../api/types";
import { useDeleteInterview, usePractiseAgain } from "../../api/mutations";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import { Speaker, TurnTranscript } from "../interview/Transcript";
import { ScoreChip } from "./ScoreVisuals";

// Keeps the separator on the title's line when the heading wraps.
const NBSP = "\u00a0";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function ReportView({ interview }: { interview: InterviewView }) {
  const { setup, report, turns } = interview;
  const models = useModels();
  const practiseAgain = usePractiseAgain();
  const remove = useDeleteInterview({ redirectTo: "/" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modelLabel = (id: string) => models.data?.find((model) => model.id === id)?.label ?? id.split(":").slice(1).join(":");

  const answeredTurns = turns.filter((turn) => turn.answer);
  const spokenCount = answeredTurns.filter((turn) => turn.delivery || turn.previousAttempts.some((attempt) => attempt.delivery)).length;

  // The weakest answer opens by default, so the report starts on what most needs rehearsing.
  const weakest = report?.questions.length
    ? report.questions.reduce((low, entry) => (entry.score < low.score ? entry : low)).index
    : null;

  const actions = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      <Button
        variant="contained"
        startIcon={<ReplayRounded />}
        disabled={practiseAgain.isPending}
        onClick={() => practiseAgain.mutate(interview.id)}
      >
        Practise again
      </Button>
      <Button component={Link} to="/" color="inherit" startIcon={<ArrowBackRounded />}>
        All interviews
      </Button>
    </Stack>
  );

  return (
    <Stack spacing={{ xs: 4, md: 5 }} sx={{ maxWidth: 1000, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ justifyContent: "space-between", alignItems: { md: "flex-end" } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="h1" sx={{ fontSize: { xs: "1.875rem", md: "2.5rem" }, lineHeight: 1.15, overflowWrap: "anywhere" }}>
            {setup.requirements.title}
            {setup.requirements.company ? `${NBSP}· ${setup.requirements.company}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {INTERVIEW_TYPE_LABELS[setup.interviewType]} · {DIFFICULTY_LABELS[setup.difficulty]} · {MODE_LABELS[setup.mode].label} mode
            {setup.voice === "spoken" && " · Spoken"}
            {report && ` · Assessed by ${modelLabel(report.modelId)}`} · {formatDate(interview.completedAt ?? interview.createdAt)}
          </Typography>
        </Box>
        {actions}
      </Stack>

      {practiseAgain.error && <Alert severity="error">{practiseAgain.error.message}</Alert>}

      {!report ? (
        <Alert severity="info">This interview ended without a report.</Alert>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderColor: "script.rule", p: { xs: 2.5, sm: 4, md: 5 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "auto minmax(0, 1fr)" },
                gap: { xs: 2.5, sm: 5, md: 7 },
                alignItems: "center",
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography
                    aria-label={`Overall score ${report.overallScore} out of 10`}
                    sx={{
                      fontSize: { xs: 64, md: 88 },
                      fontWeight: 800,
                      lineHeight: 0.9,
                      letterSpacing: "-0.04em",
                      backgroundImage: (theme) =>
                        `linear-gradient(transparent 62%, ${theme.vars!.palette.script.highlight} 62%, ${theme.vars!.palette.script.highlight} 92%, transparent 92%)`,
                      px: 0.5,
                    }}
                  >
                    {report.overallScore}
                  </Typography>
                  <Typography variant="h5" component="span" color="text.secondary" aria-hidden>
                    / 10
                  </Typography>
                </Stack>
              </Box>
              <Typography sx={{ fontSize: { xs: "1.0625rem", md: "1.25rem" }, lineHeight: 1.6, maxWidth: "38em" }}>
                {report.summary}
              </Typography>
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 5fr) minmax(0, 7fr)" },
              gap: { xs: 4, md: 6 },
            }}
          >
            <Box component="section" aria-labelledby="strengths-heading">
              <Typography id="strengths-heading" variant="h6" component="h2" sx={{ mb: 2 }}>
                What went well
              </Typography>
              <Stack component="ul" spacing={1.5} sx={{ listStyle: "none", p: 0, m: 0 }}>
                {report.strengths.map((strength) => (
                  <Typography component="li" key={strength} sx={{ lineHeight: 1.7 }}>
                    <Box
                      component="mark"
                      sx={{ bgcolor: "script.highlight", color: "script.highlightInk", px: 0.5, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
                    >
                      {strength}
                    </Box>
                  </Typography>
                ))}
              </Stack>
            </Box>
            <Box component="section" aria-labelledby="next-heading" sx={{ borderLeft: "1px dashed", borderColor: "script.pencil", pl: { xs: 2.5, md: 4 } }}>
              <Typography id="next-heading" variant="h6" component="h2" sx={{ mb: 2, color: "script.pencil" }}>
                What to work on next
              </Typography>
              <Stack spacing={2.5}>
                {report.improvements.map((item) => (
                  <Box key={item.area}>
                    <Typography sx={{ fontWeight: 700 }}>{item.area}</Typography>
                    <Typography sx={{ color: "script.pencil", lineHeight: 1.65 }}>{item.suggestion}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>

          {report.delivery && (
            <Paper component="section" aria-labelledby="delivery-heading" variant="outlined" sx={{ borderColor: "script.rule", p: { xs: 2.5, sm: 4 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.5, sm: 4 }} sx={{ alignItems: { sm: "baseline" }, mb: 2.5 }}>
                <Typography id="delivery-heading" variant="h6" component="h2">
                  How you said it
                </Typography>
                <Box>
                  <ScoreChip score={report.delivery.score} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Delivery, scored apart from content · based on {spokenCount} of {answeredTurns.length} answers, the ones you spoke
                </Typography>
              </Stack>
              <Typography sx={{ lineHeight: 1.65, maxWidth: "42em", mb: report.delivery.strengths.length || report.delivery.improvements.length ? 3 : 0 }}>
                {report.delivery.summary}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 5fr) minmax(0, 7fr)" }, gap: { xs: 3, md: 6 } }}>
                {report.delivery.strengths.length > 0 && (
                  <Stack component="ul" spacing={1.25} sx={{ listStyle: "none", p: 0, m: 0 }}>
                    {report.delivery.strengths.map((strength) => (
                      <Typography component="li" key={strength} sx={{ lineHeight: 1.65 }}>
                        <Box component="mark" sx={{ bgcolor: "script.highlight", color: "script.highlightInk", px: 0.5, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
                          {strength}
                        </Box>
                      </Typography>
                    ))}
                  </Stack>
                )}
                {report.delivery.improvements.length > 0 && (
                  <Stack spacing={2} sx={{ borderLeft: "1px dashed", borderColor: "script.pencil", pl: { xs: 2.5, md: 4 }, gridColumn: report.delivery.strengths.length ? undefined : "1 / -1" }}>
                    {report.delivery.improvements.map((item) => (
                      <Box key={item.area}>
                        <Typography sx={{ fontWeight: 700 }}>{item.area}</Typography>
                        <Typography sx={{ color: "script.pencil", lineHeight: 1.65 }}>{item.suggestion}</Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
                Confidence is judged from your words and pauses, not your tone of voice.
              </Typography>
            </Paper>
          )}
        </>
      )}

      <Box component="section" aria-labelledby="questions-heading">
        <Typography id="questions-heading" variant="h6" component="h2" sx={{ mb: 2 }}>
          Question by question
        </Typography>
        <Box sx={{ borderTop: 1, borderColor: "script.rule" }}>
          {answeredTurns.map((turn) => {
            const assessment = report?.questions.find((entry) => entry.index === turn.index);
            return (
              <Accordion
                key={turn.index}
                defaultExpanded={turn.index === weakest}
                disableGutters
                square
                sx={{ bgcolor: "transparent", borderBottom: 1, borderColor: "script.rule", "&.Mui-expanded": { bgcolor: "background.paper" } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: { sm: "center" }, width: "100%", pr: 1 }}>
                    <Typography sx={{ fontWeight: 800, color: "text.secondary", width: 32, flexShrink: 0 }}>{turn.index + 1}</Typography>
                    <Typography sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }}>{turn.question}</Typography>
                    {assessment && (
                      <Box sx={{ flexShrink: 0 }}>
                        <ScoreChip score={assessment.score} />
                      </Box>
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: { xs: 1.5, sm: 4 }, pb: 4 }}>
                  <Stack spacing={4}>
                    {assessment && (
                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 2.5, md: 5 } }}>
                        <Box sx={{ borderLeft: "1px dashed", borderColor: "script.pencil", pl: 2.5 }}>
                          <Speaker color="script.pencil">Assessment</Speaker>
                          <Typography variant="body2" sx={{ color: "script.pencil", lineHeight: 1.65 }}>
                            {assessment.note}
                          </Typography>
                        </Box>
                        <Box>
                          <Speaker color="text.primary">
                            <Box component="mark" sx={{ bgcolor: "script.highlight", color: "script.highlightInk", px: 0.5 }}>
                              A strong answer would include
                            </Box>
                          </Speaker>
                          <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                            {assessment.strongAnswer}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    <TurnTranscript turn={turn} interviewId={interview.id} showCoaching hideQuestion />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, borderTop: 1, borderColor: "script.rule", pt: 4 }}
      >
        {actions}
        <Button color="error" variant="outlined" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmDelete(true)} sx={{ mt: { xs: 3, sm: 0 } }}>
          Delete this interview
        </Button>
      </Stack>

      <ConfirmDeleteDialog
        open={confirmDelete}
        pending={remove.isPending}
        error={remove.error}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(interview.id)}
      />
    </Stack>
  );
}
