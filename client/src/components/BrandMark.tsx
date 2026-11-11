import { Box } from "@mui/material";

/**
 * The AI Interviewer mark: a speech bubble (the interview) holding a highlighted line and a script
 * line (the rehearsal). Drawn inline so it ships with the page and never shows a stale cached icon.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Box component="svg" viewBox="0 0 32 32" aria-hidden sx={{ width: size, height: size, flexShrink: 0, display: "block" }}>
      <path d="M6 4h20a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H14l-6.5 5.2a.8.8 0 0 1-1.3-.62V25H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="#ffffff" />
      <rect x="7" y="9" width="18" height="5.5" rx="1.25" fill="#ffe14d" />
      <rect x="8.5" y="10.9" width="13" height="1.7" rx="0.85" fill="#17181b" />
      <rect x="8.5" y="17.6" width="10" height="1.7" rx="0.85" fill="#17181b" />
    </Box>
  );
}

/** The mark with the wordmark: "AI" set on the highlighter, as a candidate would mark their strongest line. */
export default function BrandLogo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <BrandMark />
      <Box component="span" sx={{ fontWeight: 800, fontSize: "1.0625rem", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
        <Box
          component="span"
          sx={{ bgcolor: "script.highlight", color: "script.highlightInk", px: 0.625, mr: 0.75, borderRadius: 0.5 }}
        >
          AI
        </Box>
        Interviewer
      </Box>
    </Box>
  );
}
