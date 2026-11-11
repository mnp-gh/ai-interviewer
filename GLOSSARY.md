# AI Interviewer

A practice tool: a candidate rehearses a job interview with an AI interviewer, tailored to their resume and a target job description, and gets coaching on how they did.

## Language

### People

**Candidate**:
The person practising an interview. The only human party in the system; there is no employer or recruiter.
_Avoid_: User, applicant, interviewee

**Interviewer**:
The AI persona that asks the questions. Never a human.
_Avoid_: GPT, bot, assistant

**Coach**:
The AI persona that gives feedback and answers coach chat. Played by the same model as the interviewer, but kept apart: the interviewer never sees what the coach said.
_Avoid_: Interviewer (when meaning feedback), tutor

### Setting up

**Resume**:
The candidate's CV, supplied as a PDF or pasted text, from which the interview is tailored.
_Avoid_: CV (in code), profile

**Job Description**:
The text of the role the candidate is practising for.
_Avoid_: JD (in prose), job posting

**Candidate Profile**:
The structured summary extracted from a resume (role, experience, skills, projects), reviewed and edited by the candidate before the interview starts.
_Avoid_: Parsed resume, resume data

**Role Requirements**:
The structured summary extracted from a job description (must-have skills, nice-to-haves, responsibilities), reviewed and edited by the candidate before the interview starts.
_Avoid_: Parsed JD, JD data

**Role Briefing**:
What public web sources say about the company and role (what the company does, its interview process, commonly asked questions, topics to prepare), each point linked to its source. Reviewed by the candidate before the interview; about a third of the questions draw on it. A **general** briefing covers the role alone when there is no company to research.
_Avoid_: Research, knowledge base, intel

**Match**:
The overlap and gaps between a candidate profile and role requirements, shown before the interview starts.
_Avoid_: Fit score, compatibility

**Interview Type**:
The kind of questions asked: Behavioral, Technical, or Mixed.

**Difficulty**:
The seniority the questions are pitched at: Junior, Mid, or Senior.

**Length**:
The number of questions the candidate chose for an interview.

**Model**:
The AI model the candidate chose to play the interviewer, fixed for the whole interview unless the candidate switches after a failure.
_Avoid_: GPT, engine, provider (a provider hosts models; it is not one)

**Mode**:
Whether feedback is shown after each answer (**Coach**) or held back until the report (**Mock**).

**Voice**:
Whether an interview is **spoken** (the interviewer reads each question aloud and the candidate answers out loud) or **typed**. Chosen at setup and fixed for the interview; in a spoken interview the candidate may still type any single answer.
_Avoid_: Mode, audio mode, voice mode

**Speech Model**:
The AI model that turns a candidate's spoken attempt into text, chosen at setup for a spoken interview. After a failure the candidate may switch to another speech model or to the browser's own recognition; attempts the browser transcribes get no delivery judgement.
_Avoid_: Model (that plays the interviewer), transcriber

### Keeping history

**History**:
A candidate's interviews, newest first. Kept against this browser's **candidate id** until it is saved.

**Candidate Id**:
The random, anonymous id the server gives each browser (in a cookie). Every interview belongs to one.
_Avoid_: User id, account, session

**Saving** (history):
Linking the candidate id to a **passkey** or **recovery code**, so it can be restored in another browser.
_Avoid_: Sign up, register, create an account

**Passkey**:
A device credential (Face ID, Touch ID, Windows Hello, a phone's screen lock) that restores a saved history. No email or password.

**Recovery Code**:
A one-time-shown code (`XXXX-XXXX-XXXX-XXXX-XXXX`) that restores a saved history; the fallback when a passkey isn't available.
_Avoid_: Password, backup code

**Restoring**:
Switching a browser to a saved history with a passkey or recovery code. The browser's unsaved interviews move into it.
_Avoid_: Log in, sign in (except "sign out of this browser")

### Interviewing

**Interview**:
One practice session: a setup, a sequence of turns, and (once finished) a report. It is either in progress or completed; one ended early is still completed.
_Avoid_: Session, context, conversation

**Turn**:
One question, the candidate's attempts at answering it, the feedback on each, and any coach chat.
_Avoid_: Message, exchange

**Question**:
What the interviewer asks in a turn; may follow up on earlier answers.

**Answer**:
The candidate's response to a question. A turn's answer is its latest attempt.

**Attempt**:
One answer to a question. In coach mode the candidate may retry a question after its feedback (up to two retries); the report scores the best attempt.
_Avoid_: Try, submission

**Recording**:
The audio of one spoken attempt, kept with the interview so the candidate can replay it. One continuous take, limited in length: recording again before sending replaces it. Each retry has its own recording.
_Avoid_: Voice note, audio answer

**Content**:
What an attempt says. For a spoken attempt, that is the text as the candidate corrected it before sending.
_Avoid_: Substance

**Delivery**:
How a spoken attempt was said: pace, filler words, pauses and confidence. Judged from its recording and the uncorrected transcription, never from the candidate's edits; confidence is read from words and pauses, not tone of voice. Scored apart from content.
_Avoid_: Fluency, communication, presentation

**Feedback**:
The coach's short assessment of a single attempt: its content and, if spoken, its delivery.
_Avoid_: Verdict, review

**Coach Chat**:
A short conversation in which the candidate asks the coach about feedback on an answer. Coach mode only; never seen by the interviewer and never scored.
_Avoid_: Follow-up (that is the interviewer's job), conversation

**Report**:
The structured assessment of a whole interview, produced when it ends: overall score, per-question scores, strengths, and gaps with ways to improve. A spoken interview's report also has a separate delivery score and notes, covering only the attempts that were spoken.
_Avoid_: Feedback, verdict, result

**Transcript**:
The ordered record of an interview's turns as the candidate experienced them.
_Avoid_: Context, history, log
