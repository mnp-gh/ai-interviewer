import ArrowForward from "@mui/icons-material/ArrowForward";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { Speaker } from "./interview/Transcript";
import { useInterviews } from "../api/queries";
import InterviewHistory from "./InterviewHistory";

const steps: { title: string; body: string }[] = [
  {
    title: "Bring your resume and the job",
    body: "Upload your resume and paste the job description. We pull out your profile and the role's requirements, and you can fix anything we got wrong.",
  },
  {
    title: "Answer tailored questions",
    body: "Pick the type, level and length. The interviewer asks about your experience and the role, and follows up on what you say.",
  },
  {
    title: "Get a coaching report",
    body: "See a score for every answer, what a strong answer would have included, and the few things to work on next.",
  },
];

/** What a page of the script looks like: an illustrative example, labelled as one. */
function ExampleScript() {
  return (
    <Paper
      variant="outlined"
      aria-label="Example of a practice interview"
      sx={{ borderColor: "script.rule", p: { xs: 2.5, sm: 4 }, position: "relative", overflow: "hidden" }}
    >
      <Typography
        variant="caption"
        sx={{ position: "absolute", top: 12, right: 16, color: "text.secondary", fontWeight: 700 }}
      >
        Example
      </Typography>
      <Stack spacing={2.5}>
        <Box>
          <Speaker>Interviewer · Question 3</Speaker>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: "1.0625rem", sm: "1.25rem" }, lineHeight: 1.35 }}>
            Tell me about a time you had to cut scope to hit a release date. What did you protect?
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 190px" },
            gap: { xs: 2, sm: 3 },
            alignItems: "start",
          }}
        >
          <Box>
            <Speaker color="text.primary">You</Speaker>
            <Typography sx={{ lineHeight: 1.7 }}>
              We had three weeks before the app release. I kept the goal-setting flow and cut the illustrations, because
              research showed people dropped off at step two…
            </Typography>
          </Box>
          <Box sx={{ borderLeft: "1px dashed", borderColor: "script.pencil", pl: 2 }}>
            <Speaker color="script.pencil">Coach</Speaker>
            <Typography variant="body2" sx={{ color: "script.pencil", lineHeight: 1.6 }}>
              Good: you name your own decision. Now land the outcome: what happened after release?
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function HomePage() {
  const interviews = useInterviews();
  // Returning candidates come back for their interviews: give them the list, not the introduction.
  if (interviews.isPending || interviews.data?.length) return <InterviewHistory asPage />;

  return (
    <Stack spacing={{ xs: 6, md: 9 }} useFlexGap>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 5fr) minmax(0, 6fr)" },
          gap: { xs: 4, md: 7 },
          alignItems: "center",
          pt: { md: 3 },
        }}
      >
        <Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{ fontSize: { xs: "2.25rem", sm: "2.75rem", md: "3.25rem" }, lineHeight: 1.08, mb: 2.5, textWrap: "balance" }}
          >
            Practise the interview before it counts
          </Typography>
          <Typography sx={{ fontSize: "1.125rem", color: "text.secondary", mb: 4, maxWidth: "32em" }}>
            A mock interview tailored to your resume and the job you want, with honest feedback on every answer.
          </Typography>
          <Button component={Link} to="/new" variant="contained" size="large" endIcon={<ArrowForward />}>
            Start a practice interview
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Free, no sign-up. Your interviews stay tied to this browser.
          </Typography>
        </Box>
        <ExampleScript />
      </Box>

      <InterviewHistory />

      <Box component="section" aria-labelledby="how-heading">
        <Typography id="how-heading" variant="h5" component="h2" sx={{ mb: 3 }}>
          How it works
        </Typography>
        <Box
          component="ol"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            gap: { xs: 3, md: 5 },
          }}
        >
          {steps.map((step, index) => (
            <Box component="li" key={step.title} sx={{ borderTop: 2, borderColor: "text.primary", pt: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.0625rem", mb: 1 }}>
                <Box component="span" sx={{ bgcolor: "script.highlight", color: "script.highlightInk", px: 0.75, mr: 1, borderRadius: 0.5 }}>
                  {index + 1}
                </Box>
                {step.title}
              </Typography>
              <Typography color="text.secondary">{step.body}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
