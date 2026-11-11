import { Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../components/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", py: 8 }}>
      <Typography variant="h3" component="h1" sx={{ fontSize: { xs: "1.875rem", md: "2.5rem" } }}>
        Page not found
      </Typography>
      <Typography color="text.secondary">That page doesn't exist, or the interview was deleted.</Typography>
      <Button component={Link} to="/" variant="contained">
        Go home
      </Button>
    </Stack>
  );
}
