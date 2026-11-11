---
name: AI Interviewer
description: Interview practice set as a marked-up rehearsal script.
colors:
  ink: "#17181b"
  paper: "#ffffff"
  concrete: "#e6e8eb"
  ink-muted: "#55585f"
  rule: "#d9dbe0"
  studio: "#17181b"
  studio-ink: "#f4f5f7"
  highlighter: "#ffe14d"
  highlighter-ink: "#17181b"
  pencil: "#2f5bd3"
  pencil-wash: "#eef2fc"
  tape-green: "#1f7a4d"
  tape-amber: "#9a5b00"
  tape-red: "#c2362b"
  ink-dark: "#eceef1"
  primary-dark: "#f1f2f4"
  primary-ink-dark: "#121316"
  paper-dark: "#1a1b1f"
  concrete-dark: "#0d0e10"
  ink-muted-dark: "#a4a8b0"
  rule-dark: "#2f3238"
  studio-dark: "#000000"
  highlighter-dark: "#f5d63d"
  highlighter-ink-dark: "#121316"
  pencil-dark: "#93b0ff"
  pencil-ink-dark: "#0c1530"
  pencil-wash-dark: "#1d2436"
  tape-green-dark: "#5fcf95"
  tape-amber-dark: "#f0b44c"
  tape-red-dark: "#ff8a7f"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  score:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "88px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  cue:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.6
  line:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\""
  note:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  speaker:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "0.14em"
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0em"
rounded:
  mark: "3px"
  chip: "4px"
  page: "6px"
  dialog: "8px"
  inset: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
  3xl: "48px"
  rail: "240px"
components:
  studio-band:
    backgroundColor: "{colors.studio}"
    textColor: "{colors.studio-ink}"
    height: "60px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 18px"
  button-primary-large:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "11px 26px"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-ink-dark}"
    rounded: "{rounded.pill}"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "5px 18px"
  script-page:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.page}"
    padding: "40px 48px"
  scene-current:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.highlighter-ink}"
    rounded: "{rounded.page}"
    padding: "6px 8px"
    height: "36px"
  scene-upcoming:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.page}"
    padding: "6px 8px"
    height: "36px"
  speaker-label:
    textColor: "{colors.ink-muted}"
    typography: "{typography.speaker}"
  coach-note:
    backgroundColor: "{colors.pencil-wash}"
    textColor: "{colors.pencil}"
    typography: "{typography.note}"
    rounded: "{rounded.page}"
    padding: "16px 20px"
    width: "42em"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.page}"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
  highlight-tag:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.highlighter-ink}"
    rounded: "{rounded.mark}"
    padding: "4px 8px"
---

# Design System: AI Interviewer

## Overview

**Creative North Star: "Audition Sides"**

The interview is a rehearsal script you run. A near-black studio band holds the brand and navigation; script pages are bright white sheets (charcoal in dark mode) laid on a cool concrete-grey ground; the ink is near-black. Each exchange is set like a page of sides: the Interviewer's cue in large bold type, your line beneath it in comfortable reading type, and the Coach's notes pencilled in blue directly under your line, on a pencil-wash panel behind a dashed rule. This replaces the chat-bubble transcript (avatars, tinted "me" bubbles) the category defaults to.

Colour is scarce and assigned by meaning. Highlighter yellow marks where you are and what to look at (the current scene, the overall score, a run in progress, a selected option); director's-pencil blue is the Coach's voice and the interactive accent (links, focus, the coach input); green, amber and red appear only as real score states. Everything else is ink on paper. Density is calm: a single reading column with generous line height, one page per screen, no decoration layered on top.

One family, Atkinson Hyperlegible Next, carries everything, from the 88px score numeral to the 12px tracked speaker names, with tabular figures throughout. Depth comes from paper on ground and hairline rules, never from shadow.

**Key Characteristics:**
- Black-box studio band over a concrete ground; white script pages with hairline borders.
- Speaker names in tracked uppercase, set like character names in a script.
- Coach notes in pencil blue, under the line they are about, on a pencil-wash panel behind a 1px dashed pencil rule, at reading width (42em).
- Highlighter yellow always sits behind ink-coloured text, never used as text.
- Ink pill buttons; 6px page corners; flat surfaces.
- Light and dark schemes are both first-class and mapped role for role.

## Colors

Ink on paper with two marking colours (highlighter and pencil) and three spike-tape state colours held in reserve.

### Primary
- **Rehearsal Ink** (`ink` / `primary-dark`): text, primary pill buttons, completed and active step marks, the 2px top rule on home steps. In dark mode the role inverts to near-white with near-black button text (`primary-ink-dark`).
- **Studio Black** (`studio` / `studio-dark`): the sticky app bar, carrying the brand and nav in `studio-ink`. Hover on studio controls is a white wash at 8% alpha.

### Secondary
- **Director's Pencil** (`pencil` / `pencil-dark`): everything the Coach says (notes, the "Coach" speaker name, the "What to work on next" heading, the coach input's outlined Ask button), plus every link, focus outline, and focused input border and label. `pencil-wash` backs coach notes when they drop inline on narrow screens.

### Tertiary
- **Highlighter Yellow** (`highlighter` / `highlighter-dark`, with `highlighter-ink`): the current scene in the rail, the band behind the overall score numeral, the "In progress · Resume" tag, the numbers on the home steps, selected toggle buttons and mode cards, the tab indicator (3px), the slider thumb ring, the active step number, and text selection.

### Neutral
- **Concrete Ground** (`concrete` / `concrete-dark`): the page background under every sheet.
- **Script Paper** (`paper` / `paper-dark`): cards, the script page, input fields, chips.
- **Muted Ink** (`ink-muted` / `ink-muted-dark`): secondary text, interviewer speaker names, upcoming scenes, metadata lines.
- **Hairline Rule** (`rule` / `rule-dark`): card and page borders, dividers between scenes, MUI divider, scrollbar thumb.
- **Spike Tape** (`tape-green`, `tape-amber`, `tape-red` and their `-dark` pairs): score bands (Strong, Getting there, Needs work), alerts, and destructive actions only.

### Named Rules
**The Highlighter Rule.** Yellow is a mark laid behind ink-coloured text (`highlighter-ink`); it is never a text colour, and it marks one thing per region: where you are or what matters most.

**The Pencil Rule.** Blue means the Coach or an affordance you can act on. Interviewer and candidate text are always ink.

**The Spike Tape Rule.** Green, amber and red mark real states only, and a state colour always travels with an icon and a label, never alone.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Atkinson Hyperlegible Next (same stack)

**Character:** A single legibility-first grotesque used at weights 400 to 800. Hierarchy comes from size and weight steps (400 body, 600 to 700 titles and buttons, 800 display and speaker names), not from a second family. Body text sets tabular figures globally (`font-variant-numeric: tabular-nums`).

### Hierarchy
- **Display** (`display`): the home hero only; steps 2.25rem / 2.75rem / 3.25rem across xs / sm / md, balanced wrap.
- **Score** (`score`): the report's overall score numeral, 64px on mobile, 88px from md, with a highlighter band from 62% to 92% of its height behind it and "/ 10" in muted h5 beside it.
- **Headline** (`headline`): page titles (setup, report, not-found), 1.875rem on mobile.
- **Cue** (`cue`): the Interviewer's question, 1.25rem on mobile, max 36em.
- **Title** (`title`, MUI h6 at 1.125rem / 700; h5 at 1.5rem / 700 for section and room headings): card and section heads.
- **Line** (`line`): the candidate's answer and the answer field, max 40em.
- **Body** (`body`): general copy; secondary copy at 0.875rem in muted ink.
- **Note** (`note`): coach notes and the candidate's questions to the coach.
- **Speaker** (`speaker`): uppercase, tracked 0.14em, 6px below; colour follows who is speaking (muted for Interviewer, ink for You, pencil for Coach).
- **Label** (`label`): buttons (no text-transform), tabs, toggle buttons; large buttons step to 1rem.

### Named Rules
**The Character Name Rule.** Tracked uppercase is reserved for naming who speaks: Interviewer, You, Coach, and their qualifiers (Question n, Attempt n, to the coach). It is not a section label for arbitrary content.

**The One Family Rule.** Atkinson Hyperlegible Next everywhere; contrast comes from weight (400 to 800) and size, with negative tracking only at 1.5rem and above.

## Layout

MUI's 8px spacing unit governs everything; the reused steps are 4, 8, 16, 24, 32, 40 and 48px. Content sits in a 1200px (MUI `lg`) container with 24px vertical page padding on mobile and 40px from md. Reading measures are capped in ems (cue 36em, line and coach chat 40em, report summary 38em, lede 32em).

The interview room is a two-column grid from md: a sticky 240px rail (role header, "Question n of N", the scene list, End interview) beside one script page with 48px horizontal and 40px vertical padding (20px / 24px on mobile), scenes separated by hairline dividers at 32px. Answered questions fold to one line each ("Question n · question · Show") so the current question owns the page; the scene rail reopens any of them. Inside a scene everything stacks in one reading column capped at 42em: the cue, your line, the Coach's notes under it, then an optional one-line "Ask the coach" field and the next-step buttons. Below md the rail becomes a horizontal, scrollable scene strip of bordered number boxes.

Home pairs the hero and an example script page in a 5:6 grid (56px gap at md), then history, then a three-column "How it works" list. The report is capped at 1000px with a 5:7 strengths / next-steps grid. Setup is capped at 960px.

## Elevation & Depth

Flat. Papers render at elevation 0 and buttons disable elevation; depth comes only from white paper on the concrete ground, a 1px hairline border in `rule`, and the sticky studio band. The one ring in the system is the slider thumb (`0 0 0 4px` highlighter), which is a mark, not a shadow.

### Named Rules
**The Paper Lift Rule.** A surface separates from the ground by tone and a hairline border, never by a drop shadow.

## Shapes

Gently rounded sheets (`page`, 6px) for cards, the script page, inputs, alerts and scene rows; tighter 3 to 4px corners for small marks, tags, chips and tooltips; 8px for dialogs; 12px for inset boxes inside forms (the resume drop zone, profile entry boxes). Every button is a full pill (`pill`). Lines carry meaning: solid 1px hairlines divide and frame, a 2px solid ink rule tops home steps, a 1px dashed pencil rule fences the Coach's notes, and a 2px dashed rule outlines the resume drop zone. The brand mark is a white script sheet with a yellow highlighted line on a 7px-rounded black tile.

## Components

### Buttons
Confident ink pills with no shadow.
- **Shape:** full pill (`pill`), 18px side padding, 26px for large, 12px for small.
- **Primary:** contained ink with paper text (`button-primary`); in dark mode, near-white with near-black text. Disabled renders as MUI's grey fill.
- **Outlined:** border in currentColor; used with inherit colour for secondary actions (End interview, Answer again), pencil for Ask, red for Delete.
- **Studio:** text buttons and icon buttons inside the band in `studio-ink`, hovering to an 8% white wash.
- **Focus:** global 2px pencil outline, 2px offset.

### Chips
- **Score chip:** outlined in the band colour (spike tape) on paper, with icon and "n/10 · Label", label text in ink, weight 700, 4px corners.
- **Highlight tag:** a 14px / 700 inline mark on highlighter with 3px corners for a run in progress.

### Cards / Containers
- **Corner Style:** 6px (`page`).
- **Background:** paper on the concrete ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px `rule`. Selectable cards (interview mode) use a 2px border in divider, turning ink with a highlighter fill when selected.
- **Internal Padding:** 24px card content; script and report pages 20 / 32 / 40px stepping up to 48px horizontal in the room.

### Inputs / Fields
- **Style:** MUI outlined field, full width, paper fill, 6px corners. The answer field uses the `line` type (1.0625rem / 1.7).
- **Focus:** border and floating label shift to pencil.
- **Error / Disabled:** MUI defaults on the spike-tape red.

### Navigation
- **Studio band:** sticky, 56px tall on mobile and 60px from sm, 26px brand mark beside "AI Interviewer" at 800 / 1.0625rem. "New interview" and "Save history" collapse to icon buttons or hide on xs; a theme toggle always shows.
- **Tabs:** 700 weight, no transform, 44px min height, selected tab in ink with a 3px highlighter indicator.

### Scene Rail (signature)
The run-through as numbered scenes. Each row is 36px min height, 0.875rem, a 22px number column (a check icon once answered) and the question truncated with an ellipsis. Upcoming scenes are muted, done scenes are ink, and the current scene is ink-on-highlighter at 700. When the current scene changes, the highlighter sweeps across it left to right (background-size 0 to 100% over 420ms, `cubic-bezier(0.22, 1, 0.36, 1)`), disabled under reduced motion. Below md the rail is a horizontal strip of bordered number boxes.

### Script Row and Coach Notes (signature)
Speaker name, then the text. Coach notes follow the line they are about on a pencil-wash panel (6px corners, 16px by 20px padding, 1px dashed pencil rule on the left), capped at 42em; the feedback and any follow-up coach chat share that one panel, in order. Long Interviewer cues (over 140 characters) step down to 1.1875rem / 600 so they never become a wall. Streaming text ends in a 2px blinking ink caret (1s step-end), static under reduced motion.

## Do's and Don'ts

### Do:
- **Do** set every exchange as speaker name, then text: muted Interviewer cue at `cue`, ink You line at `line`, pencil Coach note at `note` on the panel under the line.
- **Do** keep highlighter behind `highlighter-ink` text and keep it to one mark per region.
- **Do** separate surfaces with paper-on-concrete and a 1px `rule` hairline.
- **Do** make every button a pill, ink-filled for the main action and outlined in currentColor for the rest.
- **Do** pair every spike-tape state colour with an icon and a label.
- **Do** honour `prefers-reduced-motion` on every animation, as the sweep and the caret do.
- **Do** define every new colour in both schemes, role for role.

### Don't:
- **Don't** render the transcript as chat bubbles with avatars or tinted "me" bubbles.
- **Don't** use drop shadows on papers, cards or buttons.
- **Don't** set text in highlighter yellow, or use pencil blue for anything the Interviewer or candidate says.
- **Don't** use tracked uppercase for anything other than naming who speaks.
- **Don't** introduce a second typeface or turn off tabular figures.
- **Don't** use green, amber or red decoratively.
