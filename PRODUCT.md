# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Job seekers practising on their own for a specific upcoming interview. They arrive with a resume and a job description, often nervous, usually on a laptop but also on a phone. In product language they are the **Candidate** (see GLOSSARY.md); there is no recruiter or employer side.

## Product Purpose
Let a candidate rehearse a job interview with an AI **Interviewer** tailored to their resume, the role and a web-researched **Role Briefing**, then get honest, specific coaching on every answer. Success: the candidate walks into the real interview knowing what will be asked and what a strong answer sounds like.

## Positioning
Two ways to practise the same tailored interview:
- **Coach mode:** feedback after each answer, a chat with the coach about it, and a retry.
- **Mock mode:** a realistic run with feedback held back until the report.

Questions come from the candidate's own resume, the real job description and a sourced briefing on the company. Free, with no sign-up and no email.

## Operating Context
Flow: Home/History → Setup wizard (materials → review the extracted profile, requirements, match and briefing → settings) → Interview room (streamed questions, typed answers, coach feedback) → Report (overall score, per-question scores and notes, strengths, what to work on). History can be saved with a passkey or recovery code. An admin usage page exists for the operator.

## Capabilities and Constraints
- Client: React 19 + Vite + MUI, React Query, React Router. The redesign may restyle freely.
- Light and dark mode both stay, with the header toggle.
- Mobile matters: candidates take interviews on phones.
- AI runs on free tiers, so responses can be slow or fail; model switching after a failure is a real flow.
- Terminology is fixed by GLOSSARY.md (Candidate, Interviewer, Coach, Role Briefing, Match, Mode…).

## Brand Commitments
Name: "AI Interviewer". Existing mark: `client/public/favicon.svg`. The user gave full visual freedom for the redesign.

## Evidence on Hand
No testimonials, user counts or benchmarks exist; do not invent any.

## Product Principles
- The candidate's own material leads: their resume, their role, their answers.
- Honest over flattering: feedback is specific and actionable.
- Zero friction to start: no accounts, no sign-up walls.
- Calm under pressure: the interview room should steady a nervous candidate, not add noise.
