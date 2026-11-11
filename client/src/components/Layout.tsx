import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import ManageHistoryOutlined from "@mui/icons-material/ManageHistoryOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { AppBar, Box, Button, Container, IconButton, Link, Toolbar, Tooltip, Typography } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useState } from "react";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import AccountDialog from "./AccountDialog";

const studioButton = { color: "script.studioInk", "&:hover": { bgcolor: "rgba(255,255,255,0.08)" } } as const;

function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const current = mode === "system" ? systemMode : mode;
  if (!current) return null; // Not resolved yet on first render.
  const next = current === "dark" ? "light" : "dark";
  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton onClick={() => setMode(next)} aria-label={`Switch to ${next} mode`} sx={studioButton}>
        {current === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
      </IconButton>
    </Tooltip>
  );
}

function HistoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="small"
        startIcon={<ManageHistoryOutlined />}
        onClick={() => setOpen(true)}
        sx={{ ...studioButton, display: { xs: "none", sm: "inline-flex" } }}
      >
        Your history
      </Button>
      <Tooltip title="Save or restore your history">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="Save or restore your history"
          sx={{ ...studioButton, display: { xs: "inline-flex", sm: "none" } }}
        >
          <ManageHistoryOutlined />
        </IconButton>
      </Tooltip>
      <AccountDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        enableColorOnDark
        sx={{ bgcolor: "script.studio", color: "script.studioInk", backgroundImage: "none", borderBottom: 1, borderColor: "divider" }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 0.5, minHeight: { xs: 56, sm: 60 } }}>
            <Link
              component={RouterLink}
              to="/"
              underline="none"
              color="inherit"
              sx={{ display: "flex", alignItems: "center", gap: 1.25, flexGrow: 1 }}
            >
              <Box component="img" src="/favicon.svg" alt="" sx={{ width: 26, height: 26 }} />
              <Typography component="span" sx={{ fontWeight: 800, fontSize: "1.0625rem", letterSpacing: "-0.01em" }}>
                AI Interviewer
              </Typography>
            </Link>
            {pathname !== "/new" && pathname !== "/" && (
              <Button
                component={RouterLink}
                to="/new"
                size="small"
                sx={{ ...studioButton, display: { xs: "none", sm: "inline-flex" }, mr: 1 }}
              >
                New interview
              </Button>
            )}
            <HistoryButton />
            <ThemeToggle />
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 3, md: 5 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
