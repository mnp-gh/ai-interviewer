import { createTheme } from "@mui/material/styles";

// "Audition sides": the interview is a rehearsal script. A black-box studio band holds the
// navigation, script pages sit on a cool concrete ground, highlighter yellow marks the current
// scene and strong lines, and director's-pencil blue carries everything the coach says.
declare module "@mui/material/styles" {
  interface Palette {
    script: ScriptColors;
  }
  interface PaletteOptions {
    script?: ScriptColors;
  }
}

type ScriptColors = {
  /** The black-box studio band (header, primary buttons). */
  studio: string;
  studioInk: string;
  studioMuted: string;
  /** Highlighter: always behind ink-coloured text, never as text itself. */
  highlight: string;
  highlightInk: string;
  /** Director's pencil: the coach's voice. */
  pencil: string;
  pencilWash: string;
  /** Hairline rules on the page. */
  rule: string;
};

const FONT = '"Atkinson Hyperlegible Next", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#17181b", contrastText: "#ffffff" },
        secondary: { main: "#2f5bd3", contrastText: "#ffffff" },
        success: { main: "#1f7a4d" },
        warning: { main: "#9a5b00" },
        error: { main: "#c2362b" },
        info: { main: "#2f5bd3" },
        text: { primary: "#17181b", secondary: "#55585f" },
        divider: "#d9dbe0",
        background: { default: "#e6e8eb", paper: "#ffffff" },
        script: {
          studio: "#17181b",
          studioInk: "#f4f5f7",
          studioMuted: "#a9adb5",
          highlight: "#ffe14d",
          highlightInk: "#17181b",
          pencil: "#2f5bd3",
          pencilWash: "#eef2fc",
          rule: "#d9dbe0",
        },
      },
    },
    dark: {
      palette: {
        primary: { main: "#f1f2f4", contrastText: "#121316" },
        secondary: { main: "#93b0ff", contrastText: "#0c1530" },
        success: { main: "#5fcf95" },
        warning: { main: "#f0b44c" },
        error: { main: "#ff8a7f" },
        info: { main: "#93b0ff" },
        text: { primary: "#eceef1", secondary: "#a4a8b0" },
        divider: "#2f3238",
        background: { default: "#0d0e10", paper: "#1a1b1f" },
        script: {
          studio: "#000000",
          studioInk: "#f4f5f7",
          studioMuted: "#9a9ea6",
          highlight: "#f5d63d",
          highlightInk: "#121316",
          pencil: "#93b0ff",
          pencilWash: "#1d2436",
          rule: "#2f3238",
        },
      },
    },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: FONT,
    h1: { fontWeight: 800, letterSpacing: "-0.025em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700, fontSize: "1.125rem" },
    subtitle2: { fontWeight: 700 },
    overline: { fontWeight: 800, letterSpacing: "0.14em", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: { fontVariantNumeric: "tabular-nums" },
        "::selection": { backgroundColor: theme.vars!.palette.script.highlight, color: theme.vars!.palette.script.highlightInk },
        ":focus-visible": { outline: `2px solid ${theme.vars!.palette.secondary.main}`, outlineOffset: 2 },
        a: { textUnderlineOffset: "0.2em" },
        "*": { scrollbarColor: `${theme.vars!.palette.divider} transparent` },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 18 },
        sizeLarge: { paddingInline: 26, paddingBlock: 11, fontSize: "1rem" },
        sizeSmall: { paddingInline: 12 },
        outlined: { borderColor: "currentColor" },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: ({ theme }) => ({ borderColor: theme.vars.palette.script.rule }) },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 24, "&:last-child": { paddingBottom: 24 } } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme.vars.palette.secondary.main },
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: ({ theme }) => ({ "&.Mui-focused": { color: theme.vars.palette.secondary.main } }) },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 4, fontWeight: 600 } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 6, alignItems: "flex-start" } } },
    MuiTabs: {
      styleOverrides: {
        indicator: ({ theme }) => ({ height: 3, backgroundColor: theme.vars.palette.script.highlight }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 700,
          textTransform: "none",
          minHeight: 44,
          "&.Mui-selected": { color: theme.vars.palette.text.primary },
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontWeight: 700,
          color: theme.vars.palette.text.primary,
          "&.Mui-selected, &.Mui-selected:hover": {
            backgroundColor: theme.vars.palette.script.highlight,
            color: theme.vars.palette.script.highlightInk,
          },
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: ({ theme }) => ({ color: theme.vars.palette.text.primary }),
        thumb: ({ theme }) => ({ boxShadow: `0 0 0 4px ${theme.vars.palette.script.highlight}` }),
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.vars.palette.text.secondary,
          "& .MuiStepIcon-text": { fill: theme.vars.palette.background.paper, fontWeight: 800 },
          "&.Mui-completed": { color: theme.vars.palette.text.primary },
          "&.Mui-active": { color: theme.vars.palette.script.highlight },
          "&.Mui-active .MuiStepIcon-text": { fill: theme.vars.palette.script.highlightInk },
        }),
      },
    },
    MuiStepLabel: { styleOverrides: { label: { fontWeight: 600, "&.Mui-active": { fontWeight: 800 } } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 8 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 800, fontSize: "1.125rem" } } },
    MuiAccordion: { styleOverrides: { root: { "&::before": { display: "none" } } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: "0.875rem", borderRadius: 4 } } },
    MuiLink: { defaultProps: { color: "secondary" } },
  },
});
