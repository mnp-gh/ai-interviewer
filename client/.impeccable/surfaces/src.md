---
version: 1
slug: "src"
primary_target: "src"
related_targets: []
---

# Surface brief: the whole client app

Scope: every route in client/src (home and history, setup wizard, interview room, report, admin, dialogs). Mode: Operate.
Audience and job: a candidate rehearsing a real upcoming interview, often nervous, on a laptop or phone. Their tasks are to set up, answer, take the coaching, read the report and come back.
Constraints: MUI stays as the component layer and is restyled through the theme; light and dark mode both stay; mobile is first-class; GLOSSARY.md terms.
Memorable moment: the interview reads as a marked-up rehearsal script, with the coach's notes pencilled in the margin beside your line.

## Direction contract

THESIS: Practice is rehearsal. The interview is a script you run: the Interviewer's cue, your line, and the Coach's pencil notes in the margin. This replaces the category's chat-bubble transcript with avatars and blue "me" bubbles.

OWN-WORLD: A black-box rehearsal room. The shell is a near-black studio band, script pages are bright white sheets (charcoal in dark mode) on a cool concrete-grey ground, and the ink is near-black. Highlighter yellow marks the current scene and your strong lines. Director's pencil blue carries everything the Coach says. Spike-tape green and red are kept for real states only. Speaker names are set in tracked small caps, as in a script. Atkinson Hyperlegible Next is used throughout, with tabular figures. Pill buttons in ink, 6px page corners, hairline rules, no shadows beyond a single paper lift.

STORY: The candidate sees the run-through laid out as numbered scenes, steps onto the current cue, delivers their line, and gets the director's notes beside it. They can retake or ask the director, and leave with a marked script (the report) that says what to rehearse next.

FIRST VIEWPORT (interview room, desktop): a black studio band carrying the brand and nav. Left is a 260px scene rail listing the numbered questions, the current one highlighted in yellow, with answered and upcoming states as printed marks. On the right is one white script page: the INTERVIEWER cue at 26px semibold, YOU and your answer below, and the answer box with "Deliver answer" as an ink pill. A 280px margin column on the page carries the COACH notes in pencil blue behind a dashed hairline rule. On mobile the rail becomes a horizontal scene strip and the notes sit inline under your line.

FORM: Audition Sides, grounded pick (my rank 1 of 7, not the roll's index 3). seed:33a02d6a6eaca6bf

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
