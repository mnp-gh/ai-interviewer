import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Delivery, InterviewView } from "../../api/types";
import { interview, models, setup, turn } from "../../test/fixtures";
import { jsonResponse, mockFetch, renderWithProviders, streamResponse } from "../../test/render";
import InterviewPage from "./InterviewPage";
import { TurnTranscript } from "./Transcript";

const event = (value: object) => `${JSON.stringify(value)}\n`;
const spokenSetup = { ...setup, voice: "spoken" as const, speechModelId: "groq:whisper-large-v3" };
const speechModels = {
  models: [{ id: "groq:whisper-large-v3", label: "Whisper Large v3", provider: "Groq", note: "Most accurate", mayTrainOnInputs: false, isDefault: true }],
  maxRecordingSeconds: 120,
  interviewerVoices: [],
};

const delivery: Delivery = {
  durationSeconds: 72,
  wordCount: 170,
  wordsPerMinute: 142,
  fillers: { um: 3, uh: 1 },
  fillerCount: 4,
  pauseCount: 2,
  longestPauseSeconds: 3.4,
  transcription: "Um so I led the queued over",
  speechModelId: "groq:whisper-large-v3",
};

const routes = (initial: InterviewView) => (url: string, init: RequestInit) => {
  if (url.endsWith("/api/models")) return jsonResponse({ models });
  if (url.endsWith("/api/speech-models")) return jsonResponse(speechModels);
  if (url.endsWith(`/api/interviews/${initial.id}`) && (init.method ?? "GET") === "GET") return jsonResponse({ interview: initial });
  return undefined;
};

describe("a spoken interview", () => {
  it("offers to record, restores an unsent recording's text, and sends it as spoken", async () => {
    const waiting = interview({
      setup: spokenSetup,
      turns: [turn({ pendingRecording: { recordingId: "r1", transcription: "Um so I led the queued over", durationSeconds: 72 } })],
    });
    let answerBody: unknown;
    mockFetch(routes(waiting), (url, init) => {
      if (url.endsWith("/answers")) {
        answerBody = JSON.parse(String(init.body));
        return streamResponse([event({ type: "done", interview: interview({ setup: spokenSetup, turns: [turn({ answer: "I led the cutover.", delivery })] }) })]);
      }
      return undefined;
    });

    renderWithProviders(<InterviewPage />, { route: "/interviews/:id", url: `/interviews/${waiting.id}` });

    expect(await screen.findByRole("button", { name: /record again/i })).toBeTruthy();
    expect(screen.getByText(/Recorded 1:12/)).toBeTruthy();
    const box = screen.getByLabelText("Your answer");
    expect((box as HTMLTextAreaElement).value).toBe("Um so I led the queued over");

    await userEvent.clear(box);
    await userEvent.type(box, "I led the cutover.");
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(answerBody).toEqual({ answer: "I led the cutover.", spoken: true });
    expect(await screen.findByText(/142 words a minute/)).toBeTruthy();
  });

  it("sends a typed answer as typed when nothing was recorded", async () => {
    const waiting = interview({ setup: spokenSetup, turns: [turn()] });
    let answerBody: unknown;
    mockFetch(routes(waiting), (url, init) => {
      if (url.endsWith("/answers")) {
        answerBody = JSON.parse(String(init.body));
        return streamResponse([event({ type: "done", interview: interview({ setup: spokenSetup, turns: [turn({ answer: "Typed." })] }) })]);
      }
      return undefined;
    });

    renderWithProviders(<InterviewPage />, { route: "/interviews/:id", url: `/interviews/${waiting.id}` });

    expect(await screen.findByRole("button", { name: /record my answer/i })).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Your answer"), "Typed.");
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(answerBody).toEqual({ answer: "Typed." });
  });
});

describe("the interviewer's voice", () => {
  it("reads each question in the enhanced voice, and says so when its daily limit moves it to the browser's voice", async () => {
    const empty = interview({ setup: spokenSetup });
    const speechRequests: string[] = [];
    mockFetch(
      (url) => (url.endsWith("/api/speech-models") ? jsonResponse({ ...speechModels, interviewerVoices: [{ id: "hannah", label: "Hannah" }] }) : undefined),
      routes(empty),
      (url) => {
        if (url.endsWith("/questions")) {
          return streamResponse([event({ type: "done", interview: interview({ setup: spokenSetup, turns: [turn()] }) })]);
        }
        if (url.includes("/questions/0/speech")) {
          speechRequests.push(url);
          return jsonResponse({ code: "DAILY_LIMIT", message: "Today's enhanced interviewer voice is used up. Your browser's voice reads the questions instead." }, 429);
        }
        return undefined;
      }
    );

    renderWithProviders(<InterviewPage />, { route: "/interviews/:id", url: `/interviews/${empty.id}` });

    expect(await screen.findByText(/enhanced interviewer voice is used up/)).toBeTruthy();
    expect(speechRequests).toEqual([`/api/interviews/${empty.id}/questions/0/speech?voice=hannah`]);
  });
});

describe("a spoken attempt in the transcript", () => {
  it("shows how it was said, its recording and what the speech model heard", async () => {
    renderWithProviders(<TurnTranscript turn={turn({ answer: "I led the cutover.", delivery, recordingId: "r1" })} interviewId="i1" showCoaching />);

    expect(screen.getByText(/1:12 · 142 words a minute · 4 fillers \(um ×3, uh ×1\) · 2 pauses over 2s/)).toBeTruthy();
    expect(document.querySelector("audio")?.getAttribute("src")).toBe("/api/interviews/i1/recordings/r1");
    await userEvent.click(screen.getByRole("button", { name: /what the speech model heard/i }));
    expect(screen.getByText("Um so I led the queued over")).toBeTruthy();
  });
});
