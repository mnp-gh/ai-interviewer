# Spoken answers are transcribed on the server, and recordings get their own collection

Spoken interviews judge **delivery** (pace, pauses, filler words, confidence) as well as content, which needs the recording and a transcript with word timings. The browser's speech recognition, the earlier plan, gives neither: Firefox lacks it, Chrome quietly sends the audio to Google, and it returns no timings. So the browser uploads each recording to our API, which transcribes it with a Groq Whisper model (the candidate's **speech model**) and keeps it. Recordings are stored in MongoDB, but in their own collection, one document per recording, not inside the interview document ([ADR 0002](0002-one-document-per-interview.md)): a long interview with retries can hold over 30 recordings, more than a document's 16 MB.

## Considered options

- **Browser speech recognition**: free and live, but no timings, no Firefox, and audio sent to Google. Kept only as a fallback after a speech model fails; those attempts get no delivery judgement.
- **Gemini** (Transcribe, or judging tone from audio): keeps filler words and can hear tone, but its free tier trains on inputs and excludes EEA/UK users. Confidence is judged from words and pauses instead.
- **Recordings on the VM's disk or in object storage**: more room, but a second store to back up and keep in step with the interview. The product owner chose the database and removes old recordings by hand.

## Consequences

- The free database holds 0.5 GB for everything. Recordings are 16 kbps (about 70 hours), the admin page shows their size and deletes old ones, and past a safety cap new answers are still judged but their audio isn't kept.
- Audio has its own budgets alongside AI tokens ([ADR 0007](0007-usage-budgets-and-bot-check-instead-of-sign-in.md)): answers capped at 2 minutes, daily audio minutes per candidate and per IP, and a global cap under Groq's free 8 hours a day.
- Whisper is known to drop "um" and "uh" at times. On Groq both Whisper models kept every one in a test clip, so filler words are counted, with a prompt written in fillers to nudge it further. If real candidates show them going missing, count only pauses instead.
