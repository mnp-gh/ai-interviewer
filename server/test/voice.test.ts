import request from "supertest";
import { describe, expect, it } from "vitest";
import { AiUnavailableError } from "../src/ai/client";
import { measureDelivery } from "../src/interview/delivery";
import { RecordingModel } from "../src/interview/recordings";
import { asCandidate, budget, doneEvent, fakeAi, fakeSpeech, setupFixture, testApp, transcriptionOf, useDatabase } from "./helpers";

useDatabase();

const audio = Buffer.from("fake opus bytes");
const spoken = { voice: "spoken" as const, speechModelId: "groq:whisper-large-v3" };

async function askFirstQuestion(candidate: ReturnType<typeof asCandidate>, overrides = {}) {
  const res = await candidate.post("/api/interviews", setupFixture({ ...spoken, ...overrides })).expect(201);
  const id = res.body.interview.id as string;
  await candidate.stream(`/api/interviews/${id}/questions`).expect(200);
  return id;
}

describe("measuring delivery", () => {
  it("counts filler sounds, pauses and pace from the word timings", () => {
    const delivery = measureDelivery(transcriptionOf("Um, so I uh |built it. Umm |then shipped"), "groq:whisper-large-v3");
    expect(delivery.fillers).toEqual({ um: 2, uh: 1 });
    expect(delivery.fillerCount).toBe(3);
    expect(delivery.pauseCount).toBe(2);
    expect(delivery.longestPauseSeconds).toBeCloseTo(3.1);
    expect(delivery.wordCount).toBe(9);
    expect(delivery.wordsPerMinute).toBeGreaterThan(0);
    expect(delivery.transcription).toBe("Um, so I uh built it. Umm then shipped");
  });
});

describe("setting up a spoken interview", () => {
  it("keeps the voice and speech model, and makes typed interviews carry none", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const spokenRes = await candidate.post("/api/interviews", setupFixture(spoken)).expect(201);
    expect(spokenRes.body.interview.setup).toMatchObject(spoken);

    const typedRes = await candidate.post("/api/interviews", setupFixture({ speechModelId: "groq:whisper-large-v3" })).expect(201);
    expect(typedRes.body.interview.setup).toMatchObject({ voice: "typed", speechModelId: null });
  });

  it("refuses a spoken interview with a speech model that isn't available", async () => {
    const { app } = testApp();
    await asCandidate(app).post("/api/interviews", setupFixture({ voice: "spoken", speechModelId: "groq:nope" })).expect(400);
  });

  it("lists the speech models and the recording limit", async () => {
    const { app } = testApp({ budget: budget({ recordingSeconds: 90 }) });
    const res = await asCandidate(app).get("/api/speech-models").expect(200);
    expect(res.body.maxRecordingSeconds).toBe(90);
    expect(res.body.models.map((model: { id: string }) => model.id)).toEqual(["groq:whisper-large-v3", "groq:whisper-large-v3-turbo"]);
  });
});

describe("a spoken answer", () => {
  it("is transcribed and kept as the unsent recording, which survives a reload", async () => {
    const { app, speech } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);

    const res = await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    expect(speech.calls).toEqual([{ model: "groq:whisper-large-v3", bytes: audio.length, mimeType: "audio/webm" }]);
    const pending = res.body.interview.turns[0].pendingRecording;
    expect(pending.transcription).toBe("Um I led the queued over to the new database");
    expect(pending.recordingId).toEqual(expect.any(String));

    const reloaded = await candidate.get(`/api/interviews/${id}`).expect(200);
    expect(reloaded.body.interview.turns[0].pendingRecording).toEqual(pending);
  });

  it("replaces an earlier unsent recording", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    const first = await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    const second = await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    expect(second.body.interview.turns[0].pendingRecording.recordingId).not.toBe(first.body.interview.turns[0].pendingRecording.recordingId);
    expect(await RecordingModel.countDocuments()).toBe(1);
  });

  it("judges content from the corrected text and delivery from the uncorrected transcription", async () => {
    const { app, ai } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);

    const res = await candidate.stream(`/api/interviews/${id}/answers`, { answer: "I led the cutover to the new database.", spoken: true }).expect(200);
    const turn = doneEvent(res.body).turns[0]!;
    expect(turn.answer).toBe("I led the cutover to the new database.");
    expect(turn.delivery).toMatchObject({ fillers: { um: 1 }, transcription: "Um I led the queued over to the new database" });
    expect(turn.recordingId).toEqual(expect.any(String));
    expect(turn.pendingRecording).toBeNull();

    const prompt = JSON.stringify(ai.calls.at(-1)!.messages);
    expect(prompt).toContain("I led the cutover to the new database.");
    expect(prompt).toContain("Um I led the queued over");
    expect(prompt).toContain("Delivery:");
    expect(prompt).toContain("um ×1");
  });

  it("can be replayed by its owner only, and is deleted with the interview", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    const answered = doneEvent((await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Done.", spoken: true })).body);
    const url = `/api/interviews/${id}/recordings/${answered.turns[0]!.recordingId}`;

    const played = await candidate.get(url).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => done(null, Buffer.concat(chunks)));
    }).expect(200);
    expect(played.headers["content-type"]).toBe("audio/webm");
    expect(played.body.equals(audio)).toBe(true);

    const part = await candidate.get(url).set("Range", "bytes=2-5").expect(206);
    expect(part.headers["content-range"]).toBe(`bytes 2-5/${audio.length}`);
    await candidate.get(url).set("Range", `bytes=${audio.length + 5}-`).expect(416);

    await asCandidate(app).get(url).expect(404);
    await candidate.delete(`/api/interviews/${id}`).expect(204);
    expect(await RecordingModel.countDocuments()).toBe(0);
  });

  it("is thrown away when the candidate types an answer instead", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    const res = await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Typed instead." }).expect(200);
    const turn = doneEvent(res.body).turns[0]!;
    expect(turn.delivery).toBeNull();
    expect(turn.recordingId).toBeNull();
    expect(await RecordingModel.countDocuments()).toBe(0);
  });

  it("refuses to send as spoken without an unsent recording", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Hi.", spoken: true }).expect(409);
  });

  it("isn't accepted in a typed interview, or in an unsupported format", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const typed = await askFirstQuestion(candidate, { voice: "typed" });
    await candidate.upload(`/api/interviews/${typed}/recordings`, audio).expect(409);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio, "audio/x-unknown").expect(415);
  });

  it("is refused when longer than the limit, or silent", async () => {
    const long = testApp({ speech: fakeSpeech({ ...transcriptionOf("words"), duration: 200 }) });
    const candidate = asCandidate(long.app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(422);

    const silent = testApp({ speech: fakeSpeech({ text: "", duration: 5, words: [] }) });
    const other = asCandidate(silent.app);
    const quietId = await askFirstQuestion(other);
    await other.upload(`/api/interviews/${quietId}/recordings`, audio).expect(422);
  });

  it("is still judged when recording storage is full, without keeping the audio", async () => {
    const { app } = testApp({ budget: budget({ recordingStorageBytes: 4 }) });
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    const res = await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    expect(res.body.interview.turns[0].pendingRecording).toMatchObject({ recordingId: null });
    const answered = doneEvent((await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Done.", spoken: true })).body);
    expect(answered.turns[0]!.delivery).not.toBeNull();
    expect(await RecordingModel.countDocuments()).toBe(0);
  });

  it("counts audio seconds against the daily budget", async () => {
    const { app } = testApp({ budget: budget({ audioSecondsPerCandidate: 15 }) });
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200); // billed as at least 10s
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    const refused = await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(429);
    expect(refused.body.code).toBe("DAILY_LIMIT");
  });

  it("reports a speech model failure so the candidate can switch speech model", async () => {
    const { app } = testApp({
      speech: fakeSpeech(new AiUnavailableError("groq:whisper-large-v3", "Whisper Large v3 has hit its rate limit.")),
    });
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    const failed = await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(503);
    expect(failed.body.code).toBe("MODEL_UNAVAILABLE");

    const switched = await candidate.put(`/api/interviews/${id}/speech-model`, { speechModelId: "groq:whisper-large-v3-turbo" }).expect(200);
    expect(switched.body.interview.setup.speechModelId).toBe("groq:whisper-large-v3-turbo");
    await candidate.put(`/api/interviews/${id}/speech-model`, { speechModelId: "groq:nope" }).expect(400);
  });

  it("can be discarded before sending", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    const res = await candidate.delete(`/api/interviews/${id}/recordings/pending`).expect(200);
    expect(res.body.interview.turns[0].pendingRecording).toBeNull();
    expect(await RecordingModel.countDocuments()).toBe(0);
  });
});

describe("delivery across attempts and the report", () => {
  it("keeps each attempt's delivery through retries and scores delivery apart in the report", async () => {
    const ai = fakeAi({
      json: (_model, messages) => {
        const system = messages[0]!.content;
        expect(system).toContain("Score delivery separately");
        return {
          overallScore: 6,
          summary: "Solid.",
          strengths: ["Clear"],
          improvements: [{ area: "Impact", suggestion: "Quantify." }],
          questions: [{ index: 0, score: 6, note: "Ok.", strongAnswer: "Metrics." }],
          delivery: { score: 5.55, summary: "You hesitated.", strengths: [], improvements: [{ area: "Fillers", suggestion: "Pause instead of um." }] },
        };
      },
    });
    const { app } = testApp({ ai });
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    await candidate.stream(`/api/interviews/${id}/answers`, { answer: "First.", spoken: true }).expect(200);
    const retried = await candidate.post(`/api/interviews/${id}/retry`).expect(200);
    expect(retried.body.interview.turns[0].previousAttempts[0].delivery).not.toBeNull();
    expect(retried.body.interview.turns[0].delivery).toBeNull();

    await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Second, typed." }).expect(200);
    const ended = await candidate.post(`/api/interviews/${id}/end`).expect(200);
    expect(ended.body.interview.report.delivery).toMatchObject({ score: 5.6, summary: "You hesitated." });
  });

  it("leaves delivery out of a typed interview's report", async () => {
    const { app, ai } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate, { voice: "typed" });
    await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Typed." }).expect(200);
    const ended = await candidate.post(`/api/interviews/${id}/end`).expect(200);
    expect(ended.body.interview.report.delivery).toBeNull();
    expect(JSON.stringify(ai.calls.at(-1)!.messages)).not.toContain("Score delivery separately");
  });

  it("hides delivery in mock mode until the interview ends", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate, { mode: "mock" });
    await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);
    await candidate.stream(`/api/interviews/${id}/answers`, { answer: "Mock answer.", spoken: true }).expect(200);
    const during = await candidate.get(`/api/interviews/${id}`).expect(200);
    expect(during.body.interview.turns[0].delivery).toBeNull();
    const ended = await candidate.post(`/api/interviews/${id}/end`).expect(200);
    expect(ended.body.interview.turns[0].delivery).not.toBeNull();
  });

  it("practising again keeps the voice and speech model", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate, { speechModelId: "groq:whisper-large-v3-turbo" });
    const again = await candidate.post(`/api/interviews/${id}/retake`).expect(201);
    expect(again.body.interview.setup).toMatchObject({ voice: "spoken", speechModelId: "groq:whisper-large-v3-turbo" });
  });
});

describe("admin recording storage", () => {
  it("shows the space recordings use and deletes old ones", async () => {
    const token = "a".repeat(40);
    process.env.ADMIN_TOKEN = token;
    try {
      const { app } = testApp();
      const candidate = asCandidate(app);
      const id = await askFirstQuestion(candidate);
      await candidate.upload(`/api/interviews/${id}/recordings`, audio).expect(200);

      const auth = (test: request.Test) => test.set("Authorization", `Bearer ${token}`);
      const usage = await auth(request(app).get("/api/admin/usage")).expect(200);
      expect(usage.body.recordings).toMatchObject({ count: 1, bytes: audio.length });
      expect(usage.body.audioSeconds.used).toBe(10);

      expect((await auth(request(app).delete("/api/admin/recordings?olderThanDays=1")).expect(200)).body).toEqual({ deleted: 0 });
      expect((await auth(request(app).delete("/api/admin/recordings?olderThanDays=0")).expect(200)).body).toEqual({ deleted: 1 });
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });
});

describe("the enhanced interviewer voice", () => {
  it("reads one of the interview's questions in the chosen voice", async () => {
    const { app, speech } = testApp();
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    const res = await candidate.get(`/api/interviews/${id}/questions/0/speech?voice=hannah`).expect(200);
    expect(res.headers["content-type"]).toBe("audio/wav");
    expect(speech.spokenCalls).toEqual([
      { model: "groq:canopylabs/orpheus-v1-english", voice: "hannah", text: "Question 1: tell me about a project you are proud of." },
    ]);

    await candidate.get(`/api/interviews/${id}/questions/1/speech?voice=hannah`).expect(404);
    await candidate.get(`/api/interviews/${id}/questions/0/speech?voice=alloy`).expect(400);
    await asCandidate(app).get(`/api/interviews/${id}/questions/0/speech?voice=hannah`).expect(404);
  });

  it("is offered with the speech models, and not for typed interviews", async () => {
    const { app } = testApp();
    const candidate = asCandidate(app);
    const models = await candidate.get("/api/speech-models").expect(200);
    expect(models.body.interviewerVoices.map((voice: { id: string }) => voice.id)).toContain("hannah");
    const typed = await askFirstQuestion(candidate, { voice: "typed" });
    await candidate.get(`/api/interviews/${typed}/questions/0/speech?voice=hannah`).expect(409);
  });

  it("stops at the per-candidate limit, so the browser's voice takes over", async () => {
    const { app } = testApp({ budget: budget({ voiceQuestionsPerCandidate: 1 }) });
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.get(`/api/interviews/${id}/questions/0/speech?voice=troy`).expect(200);
    const refused = await candidate.get(`/api/interviews/${id}/questions/0/speech?voice=troy`).expect(429);
    expect(refused.body.code).toBe("DAILY_LIMIT");
  });

  it("stops at the app-wide character budget", async () => {
    const { app } = testApp({ budget: budget({ voiceCharactersGlobal: 20 }) });
    const candidate = asCandidate(app);
    const id = await askFirstQuestion(candidate);
    await candidate.get(`/api/interviews/${id}/questions/0/speech?voice=troy`).expect(429);
  });

  it("isn't offered when its daily budget is zero", async () => {
    const { app } = testApp({ budget: budget({ voiceQuestionsGlobal: 0 }) });
    const res = await asCandidate(app).get("/api/speech-models").expect(200);
    expect(res.body.interviewerVoices).toEqual([]);
  });
});
