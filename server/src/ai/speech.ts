import { toFile } from "openai";
import { AiUnavailableError, describeFailure, providerClients } from "./client";
import type { ModelConfig, ModelRegistry } from "./models";

export type TranscribedWord = { word: string; start: number; end: number };

export type Transcription = {
  text: string;
  /** Seconds of audio. */
  duration: number;
  words: TranscribedWord[];
};

/** The seam between the app and speech providers; tests substitute a scripted fake. */
export interface SpeechClient {
  transcribe(model: ModelConfig, audio: Buffer, mimeType: string): Promise<Transcription>;
  /** Reads `text` aloud in `voice`, returning WAV audio. */
  speak(model: ModelConfig, voice: string, text: string): Promise<Buffer>;
}

/** The audio formats browsers record in, and the file extension providers recognise each by. */
export const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

/** "audio/webm;codecs=opus" -> "audio/webm". */
export const baseAudioType = (contentType: string) => contentType.split(";")[0]!.trim().toLowerCase();

// Whisper tends to tidy filler words away; a prompt written with them in nudges it to keep them.
const KEEP_FILLERS_PROMPT = "Umm, let me think, like, hmm... Okay, uh, so, um, I guess.";

export function createSpeechClient(registry: ModelRegistry, env: NodeJS.ProcessEnv = process.env): SpeechClient {
  const clientFor = providerClients(registry, env);

  return {
    async transcribe(model, audio, mimeType) {
      const type = baseAudioType(mimeType);
      try {
        const result = await clientFor(model).audio.transcriptions.create({
          file: await toFile(audio, `answer.${AUDIO_TYPES[type] ?? "webm"}`, { type }),
          model: model.model,
          language: "en",
          prompt: KEEP_FILLERS_PROMPT,
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
        });
        return {
          text: result.text.trim(),
          duration: Number(result.duration) || 0,
          words: (result.words ?? []).map(({ word, start, end }) => ({ word, start, end })),
        };
      } catch (error) {
        const failure = describeFailure(model, error);
        throw new AiUnavailableError(model.id, failure.message.replace("switch to another model", "switch to another speech model"), {
          cause: error,
        });
      }
    },

    async speak(model, voice, text) {
      try {
        const response = await clientFor(model).audio.speech.create({
          model: model.model,
          // Orpheus's voices aren't among the SDK's (OpenAI's) voice names.
          voice: voice as "alloy",
          input: text,
          response_format: "wav",
        });
        return Buffer.from(await response.arrayBuffer());
      } catch (error) {
        throw describeFailure(model, error);
      }
    },
  };
}
