// Scripted stand-ins for the AI and speech providers, free of Vitest so the end-to-end server can use them too.
import type { ZodType } from "zod";
import { AiUnavailableError, type AiClient, type ChatMessage, type OnTokens } from "../src/ai/client";
import { createModelRegistry, createSpeechRegistry, createVoiceRegistry } from "../src/ai/models";
import type { SpeechClient, Transcription } from "../src/ai/speech";

type StreamHandler = (model: string, messages: ChatMessage[]) => string | Error | Promise<string | Error>;
type JsonHandler = (model: string, messages: ChatMessage[]) => unknown;

/** A scripted AI client. Records every call; streams responses word by word; each call reports `tokensPerCall` tokens. */
export function fakeAi(handlers: { stream?: StreamHandler; json?: JsonHandler; tokensPerCall?: number } = {}) {
  const tokensPerCall = handlers.tokensPerCall ?? 100;
  const calls: { kind: "stream" | "json"; model: string; messages: ChatMessage[] }[] = [];
  let questionCount = 0;

  const defaultStream: StreamHandler = (_model, messages) => {
    const last = messages.at(-1)?.content ?? "";
    if (messages[0]?.content.includes("questions about your feedback")) return `Coach reply to: ${last}`;
    if (last.includes("Give me feedback")) return "Good structure. Add a concrete metric next time.";
    questionCount++;
    return `Question ${questionCount}: tell me about a project you are proud of.`;
  };

  const client: AiClient & { calls: typeof calls } = {
    calls,
    async *stream(model, messages, onTokens) {
      calls.push({ kind: "stream", model: model.id, messages });
      const result = await (handlers.stream ?? defaultStream)(model.id, messages);
      if (result instanceof Error) throw result;
      for (const word of result.split(/(?<= )/)) yield word;
      await onTokens?.(tokensPerCall, model.id);
    },
    async json<T>(model: { id: string }, messages: ChatMessage[], schema: ZodType<T>, onTokens?: OnTokens) {
      calls.push({ kind: "json", model: model.id, messages });
      const value = handlers.json ? handlers.json(model.id, messages) : defaultJson(messages);
      if (value instanceof Error) throw value;
      await onTokens?.(tokensPerCall, model.id);
      return schema.parse(value);
    },
  };
  return client;
}

function defaultJson(messages: ChatMessage[]): unknown {
  const system = messages[0]?.content ?? "";
  if (system.includes("end-of-interview report")) {
    const transcript = JSON.parse(messages[1]!.content.replace("Transcript:\n", "")) as unknown[];
    return {
      overallScore: 7.25,
      summary: "You communicated clearly.",
      strengths: ["Clear structure"],
      improvements: [{ area: "Impact", suggestion: "Quantify results." }],
      questions: transcript.map((_, index) => ({ index, score: 7, note: "Solid.", strongAnswer: "Mention metrics." })),
    };
  }
  if (system.includes("structured profile")) return profile;
  if (system.includes("requirements from the job description")) return requirements;
  if (system.includes("Compare the candidate profile")) return match;
  if (system.includes("interview briefing")) {
    return {
      about: [{ text: "Globex builds payment infrastructure.", sourceIds: [1] }],
      process: [{ text: "A system design round follows the phone screen.", sourceIds: [2] }],
      questions: [
        { text: "Design an idempotent payments API.", sourceIds: [1, 2] },
        { text: "An invented question citing nothing real.", sourceIds: [99] },
      ],
      topics: [{ text: "Distributed transactions", sourceIds: [2] }],
    };
  }
  throw new Error(`fakeAi: no JSON response scripted for: ${system.slice(0, 80)}`);
}

export const unavailable = (modelId = "groq:openai/gpt-oss-120b") =>
  new AiUnavailableError(modelId, "GPT-OSS 120B has hit its rate limit. Try again, or switch to another model.");

export type FakeAi = ReturnType<typeof fakeAi>;

/** A transcription of `text`, one word every half second, with a pause before any word that starts with "|". */
export function transcriptionOf(text: string, pauseSeconds = 3): Transcription {
  let clock = 0;
  const words = text.split(/\s+/).filter(Boolean).map((raw) => {
    if (raw.startsWith("|")) clock += pauseSeconds;
    const entry = { word: raw.replace(/^\|/, ""), start: clock, end: clock + 0.4 };
    clock += 0.5;
    return entry;
  });
  return { text: words.map((entry) => entry.word).join(" "), duration: clock, words };
}

/** A scripted speech client. Records every call; transcribes every recording as `result`. */
export function fakeSpeech(
  result: Transcription | Error | ((audio: Buffer) => Transcription | Error) = transcriptionOf("Um I led the queued over to the new database"),
  spoken: Buffer | Error = Buffer.from("RIFF fake wav")
) {
  const calls: { model: string; bytes: number; mimeType: string }[] = [];
  const spokenCalls: { model: string; voice: string; text: string }[] = [];
  const client: SpeechClient & { calls: typeof calls; spokenCalls: typeof spokenCalls } = {
    calls,
    spokenCalls,
    async transcribe(model, audio, mimeType) {
      calls.push({ model: model.id, bytes: audio.length, mimeType });
      const value = typeof result === "function" ? result(audio) : result;
      if (value instanceof Error) throw value;
      return value;
    },
    async speak(model, voice, text) {
      spokenCalls.push({ model: model.id, voice, text });
      if (spoken instanceof Error) throw spoken;
      return spoken;
    },
  };
  return client;
}

/** All providers configured, so every model is available. */
export const registry = createModelRegistry({
  GROQ_API_KEY: "test",
  MISTRAL_API_KEY: "test",
  GEMINI_API_KEY: "test",
  OPENROUTER_API_KEY: "test",
});

export const speechRegistry = createSpeechRegistry({ GROQ_API_KEY: "test" });
export const voiceRegistry = createVoiceRegistry({ GROQ_API_KEY: "test" });

export const profile = {
  name: "Jane Doe",
  headline: "Backend Engineer",
  yearsOfExperience: 4,
  skills: ["Node.js", "MongoDB"],
  experience: [{ title: "Backend Engineer", company: "Acme", period: "2021-2025", highlights: ["Built REST APIs"] }],
  projects: [],
  education: [],
};

export const requirements = {
  title: "Senior Backend Engineer",
  company: "Globex",
  seniority: "Senior",
  mustHave: ["Node.js", "Distributed systems"],
  niceToHave: [],
  responsibilities: ["Own the API platform"],
};

export const match = { summary: "You fit well.", strengths: ["Node.js"], gaps: ["Distributed systems"] };
