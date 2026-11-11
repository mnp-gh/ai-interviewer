import { Alert, Box, Button, CircularProgress, Stack } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useInterview } from "../../api/queries";
import { useDocumentTitle } from "../../components/useDocumentTitle";
import NotFoundPage from "../NotFoundPage";
import ReportView from "../report/ReportView";
import InterviewRoom from "./InterviewRoom";

export default function InterviewPage() {
  const { id = "" } = useParams();
  const interview = useInterview(id);
  const notFound = interview.error instanceof ApiError && interview.error.code === "NOT_FOUND";
  const role = interview.data?.setup.requirements.title;
  // Set here rather than only in NotFoundPage: a parent's effect runs after its child's.
  useDocumentTitle(
    notFound ? "Page not found" : role ? `${interview.data?.status === "completed" ? "Report" : "Interview"}: ${role}` : "Interview"
  );

  if (interview.isPending) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Loading the interview" />
      </Box>
    );
  }
  if (interview.error) {
    if (notFound) return <NotFoundPage />;
    return (
      <Stack spacing={2} sx={{ maxWidth: 600, mx: "auto" }}>
        <Alert severity="error">{interview.error.message}</Alert>
        <Box>
          <Button onClick={() => void interview.refetch()}>Try again</Button>
          <Button component={Link} to="/">
            Go home
          </Button>
        </Box>
      </Stack>
    );
  }
  return interview.data.status === "completed" ? (
    <ReportView interview={interview.data} />
  ) : (
    <InterviewRoom key={interview.data.id} interview={interview.data} />
  );
}
