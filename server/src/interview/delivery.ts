import type { Transcription } from "../ai/speech";
import { PAUSE_SECONDS, type Delivery } from "./schemas";

/**
 * Sounds that only fill silence. Words like "like" or "you know" are fillers only sometimes, so they
 * are left to the coach, who reads the whole transcription.
 */
const FILLERS: Record<string, string> = {
  um: "um",
  umm: "um",
  ummm: "um",
  uh: "uh",
  uhh: "uh",
  uhm: "um",
  er: "er",
  erm: "erm",
  ah: "ah",
  hmm: "hmm",
  hm: "hmm",
  mm: "mm",
  mmm: "mm",
};

const round = (value: number, places = 1) => Math.round(value * 10 ** places) / 10 ** places;

/** Measures how an attempt was said from the speech model's word timings. */
export function measureDelivery(transcription: Transcription, speechModelId: string): Delivery {
  const words = transcription.words.filter((entry) => entry.word.trim());
  const duration = transcription.duration || words.at(-1)?.end || 0;

  const fillers: Record<string, number> = {};
  for (const { word } of words) {
    const filler = FILLERS[word.toLowerCase().replace(/[^a-z]/g, "")];
    if (filler) fillers[filler] = (fillers[filler] ?? 0) + 1;
  }

  let pauseCount = 0;
  let longestPause = 0;
  for (let index = 1; index < words.length; index++) {
    const gap = words[index]!.start - words[index - 1]!.end;
    if (gap >= PAUSE_SECONDS) pauseCount++;
    longestPause = Math.max(longestPause, gap);
  }

  // Pace counts only the time spent speaking: from the first word to the last.
  const speaking = words.length ? words.at(-1)!.end - words[0]!.start : 0;
  return {
    durationSeconds: round(duration),
    wordCount: words.length,
    wordsPerMinute: speaking > 0 ? Math.round((words.length / speaking) * 60) : 0,
    fillers,
    fillerCount: Object.values(fillers).reduce((sum, count) => sum + count, 0),
    pauseCount,
    longestPauseSeconds: round(longestPause),
    transcription: transcription.text,
    speechModelId,
  };
}

/** One line of measurements for prompts, e.g. "1:05 long, 142 words a minute, 4 filler words (um ×3, uh ×1), ...". */
export function describeDelivery(delivery: Delivery): string {
  const minutes = Math.floor(delivery.durationSeconds / 60);
  const seconds = Math.round(delivery.durationSeconds % 60);
  const fillers = Object.entries(delivery.fillers)
    .map(([word, count]) => `${word} ×${count}`)
    .join(", ");
  return [
    `${minutes}:${String(seconds).padStart(2, "0")} long`,
    `${delivery.wordsPerMinute} words a minute`,
    `${delivery.fillerCount} filler sounds${fillers ? ` (${fillers})` : ""}`,
    `${delivery.pauseCount} pauses of ${PAUSE_SECONDS}s or more (longest ${delivery.longestPauseSeconds}s)`,
  ].join(", ");
}
