import CloseRounded from "@mui/icons-material/CloseRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import { isHistorySaved, useAccount } from "../api/account";
import { useDeleteInterview, usePractiseAgain } from "../api/mutations";
import { useInterviews } from "../api/queries";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS, type InterviewSummary } from "../api/types";
import AccountDialog from "../components/AccountDialog";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import { ScoreChip } from "./report/ScoreVisuals";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function HistoryRow({
  interview,
  onDelete,
}: {
  interview: InterviewSummary;
  onDelete: () => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const practiseAgain = usePractiseAgain();
  const inProgress = interview.status === "in_progress";

  return (
    <Box component="li" sx={{ borderTop: 1, borderColor: "script.rule" }}>
      <Stack direction="row" sx={{ alignItems: "center" }}>
        <Box
          component={Link}
          to={`/interviews/${interview.id}`}
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) auto" },
            columnGap: 2,
            rowGap: 1,
            alignItems: "center",
            py: 2,
            px: 1.5,
            color: "inherit",
            textDecoration: "none",
            borderRadius: 1,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 700, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}
            >
              {interview.roleTitle}
              {interview.company ? ` · ${interview.company}` : ""}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(interview.createdAt)} · {INTERVIEW_TYPE_LABELS[interview.interviewType]} ·{" "}
              {DIFFICULTY_LABELS[interview.difficulty]} · {interview.answeredCount}/{interview.length} answered
            </Typography>
          </Box>
          <Box sx={{ justifySelf: "start" }}>
            {inProgress ? (
              <Box
                component="span"
                sx={{ bgcolor: "script.highlight", color: "script.highlightInk", fontWeight: 700, fontSize: "0.875rem", px: 1, py: 0.5, borderRadius: 0.5 }}
              >
                In progress · Resume
              </Box>
            ) : interview.overallScore !== null ? (
              <ScoreChip score={interview.overallScore} />
            ) : (
              <Chip size="small" label="Completed" />
            )}
          </Box>
        </Box>
        <IconButton
          aria-label="More actions"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          disabled={practiseAgain.isPending}
          sx={{ ml: 1 }}
        >
          <MoreVertRounded />
        </IconButton>
      </Stack>
      {practiseAgain.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {practiseAgain.error.message}
        </Alert>
      )}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            practiseAgain.mutate(interview.id);
          }}
        >
          Practise again with the same setup
        </MenuItem>
        <Divider />
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            setMenuAnchor(null);
            onDelete();
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

/** Until the history is saved, it lives in this browser only: say so, once there is something to lose. */
const NUDGE_DISMISSED_KEY = "ai-interviewer.saveNudgeDismissed";

function SaveHistoryNudge() {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(NUDGE_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
    } catch {
      // Blocked storage: it just comes back next visit. "Save history" stays in the header either way.
    }
  };
  if (dismissed || !account.data || isHistorySaved(account.data)) return null;
  return (
    <>
      <Alert
        severity="info"
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Button color="inherit" size="small" onClick={() => setOpen(true)}>
              Save history
            </Button>
            <IconButton size="small" color="inherit" aria-label="Dismiss" onClick={dismiss}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </Stack>
        }
      >
        These interviews are kept in this browser only. Save them with a passkey or recovery code to keep them.
      </Alert>
      <AccountDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** This browser's interviews, newest first. Renders nothing until there is at least one. */
export default function InterviewHistory({ asPage = false, title }: { asPage?: boolean; title?: string }) {
  const interviews = useInterviews();
  const remove = useDeleteInterview();
  const [deleting, setDeleting] = useState<string | null>(null);

  if (interviews.isPending) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="text" width={200} height={36} />
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={64} />
      </Stack>
    );
  }
  if (interviews.error) return <Alert severity="error">Couldn't load your interviews: {interviews.error.message}</Alert>;
  if (!interviews.data.length) return null;

  return (
    <Box component="section" aria-labelledby="history-heading">
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 2, mb: asPage ? 3 : 2 }}>
        <Typography
          id="history-heading"
          variant={asPage ? "h3" : "h5"}
          component={asPage ? "h1" : "h2"}
          sx={asPage ? { fontSize: { xs: "1.875rem", md: "2.5rem" } } : undefined}
        >
          {title ?? "Your interviews"}
        </Typography>
        {!title && (
          <Button component={Link} to="/new" variant={asPage ? "contained" : "outlined"} color={asPage ? "primary" : "inherit"}>
            New interview
          </Button>
        )}
      </Stack>
      <SaveHistoryNudge />
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, borderBottom: 1, borderColor: "script.rule" }}>
        {interviews.data.map((interview) => (
          <HistoryRow key={interview.id} interview={interview} onDelete={() => setDeleting(interview.id)} />
        ))}
      </Box>
      <ConfirmDeleteDialog
        open={deleting !== null}
        pending={remove.isPending}
        error={remove.error}
        onCancel={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => remove.mutate(deleting!, { onSuccess: () => setDeleting(null) })}
      />
    </Box>
  );
}
