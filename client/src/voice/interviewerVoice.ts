import { useCallback, useEffect, useRef, useState } from "react";

const MUTED_KEY = "ai-interviewer.interviewerMuted";
const VOICE_KEY = "ai-interviewer.interviewerVoice";

export const speechSynthesisSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered; it still applies on this page.
  }
}

// macOS ships joke voices alongside the real ones; they should never be picked, nor offered.
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Kathy|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Grandma|Grandpa|Rocko|Sandy|Shelley|Eddy|Flo|Reed)\b/i;

/** Higher is more natural-sounding: neural voices first, then Chrome's online voices, then good local ones. */
function quality(voice: SpeechSynthesisVoice): number {
  const name = voice.name;
  let score = 0;
  if (/natural|neural/i.test(name)) score += 50; // Edge's online voices
  if (/premium/i.test(name)) score += 45; // Apple's downloadable voices
  if (/enhanced/i.test(name)) score += 40;
  if (/^Google/i.test(name)) score += 30; // Chrome's online voices
  if (/^(Samantha|Ava|Allison|Susan|Zoe|Evan|Nathan|Tom|Daniel|Serena|Karen|Moira|Tessa)\b/i.test(name)) score += 20;
  if (/^en[-_](US|GB)/i.test(voice.lang)) score += 5;
  return score;
}

/** The device's English voices, best first. */
function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesisSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("en") && !NOVELTY.test(voice.name))
    .sort((a, b) => quality(b) - quality(a) || a.name.localeCompare(b.name));
}

/** Long text is split at sentences: Chrome's online voices stop speaking after about 15 seconds. */
function chunks(text: string): string[] {
  if (text.length <= 220) return [text];
  return text.match(/[^.!?]+[.!?]+["')\]]?\s*|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
}

/** A voice the interviewer can read with: the server's enhanced voices, or one of the browser's own. */
export type VoiceOption = { key: string; label: string; enhanced: boolean };

const enhancedKey = (id: string) => `enhanced:${id}`;
const browserKey = (name: string) => `browser:${name}`;

/**
 * The interviewer reading questions aloud. The enhanced voices (Orpheus, via the server) come first;
 * when their daily limits are used up, or they fail, the browser's best voice reads instead. Each
 * question is read once it has fully arrived, or again on request. The voice and muting are remembered
 * in this browser; muting only silences playback.
 */
export function useInterviewerVoice(enabled: boolean, interviewId: string, enhancedVoices: { id: string; label: string }[]) {
  const browserSupported = speechSynthesisSupported();
  const supported = enabled && (browserSupported || enhancedVoices.length > 0);
  const [muted, setMutedState] = useState(() => read(MUTED_KEY) === "true");
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(englishVoices);
  const [chosen, setChosen] = useState(() => read(VOICE_KEY));
  // Set once the server says today's enhanced voice is used up (or it fails), for the rest of the visit.
  const [fallback, setFallback] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const request = useRef(0);

  const options: VoiceOption[] = [
    ...enhancedVoices.map((voice) => ({ key: enhancedKey(voice.id), label: `${voice.label} · enhanced`, enhanced: true })),
    ...browserVoices.map((voice) => ({
      key: browserKey(voice.name),
      label: `${voice.name.replace(/^Microsoft /, "").replace(/ - English \(.*\)$/, "")} · ${voice.lang}`,
      enhanced: false,
    })),
  ];
  const selected = options.find((option) => option.key === chosen) ?? options[0];

  // Chrome loads its voices after the page does; speaking before then uses a poor default.
  useEffect(() => {
    if (!enabled || !browserSupported) return;
    const update = () => setBrowserVoices(englishVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, [enabled, browserSupported]);

  const stop = useCallback(() => {
    request.current++;
    audio.current?.pause();
    if (browserSupported) window.speechSynthesis.cancel();
  }, [browserSupported]);

  useEffect(() => {
    const urls = cache.current;
    return () => {
      stop();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [stop]);

  const sayInBrowser = useCallback(
    (text: string, key?: string) => {
      if (!browserSupported) return;
      const name = key?.startsWith("browser:") ? key.slice("browser:".length) : undefined;
      const voice = browserVoices.find((entry) => entry.name === name) ?? browserVoices[0];
      for (const part of chunks(text)) {
        const utterance = new SpeechSynthesisUtterance(part);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? "en-US";
        window.speechSynthesis.speak(utterance);
      }
    },
    [browserSupported, browserVoices]
  );

  /** Reads the interview's question `index` aloud, in `key` (default: the chosen voice). */
  const sayQuestion = useCallback(
    async (text: string, index: number, key = selected?.key) => {
      if (!supported || muted || !text.trim()) return;
      stop();
      const ticket = request.current;
      if (!key?.startsWith("enhanced:") || fallback) return sayInBrowser(text.trim(), key);

      const voiceId = key.slice("enhanced:".length);
      const cacheKey = `${index}:${voiceId}`;
      let url = cache.current.get(cacheKey);
      if (!url) {
        try {
          const response = await fetch(`/api/interviews/${interviewId}/questions/${index}/speech?voice=${encodeURIComponent(voiceId)}`);
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(body?.message ?? "The enhanced voice isn't available right now. Your browser's voice reads the questions instead.");
          }
          url = URL.createObjectURL(await response.blob());
          cache.current.set(cacheKey, url);
        } catch (error) {
          setFallback((error as Error).message);
          if (ticket === request.current) sayInBrowser(text.trim());
          return;
        }
      }
      if (ticket !== request.current) return; // stopped, or another question started, while it loaded
      audio.current ??= new Audio();
      audio.current.src = url;
      Promise.resolve(audio.current.play()).catch(() => {
        // Autoplay blocked (no click on the page yet): "Hear the question again" still works.
      });
    },
    [supported, muted, selected?.key, fallback, stop, sayInBrowser, interviewId]
  );

  const setMuted = (next: boolean) => {
    setMutedState(next);
    if (next) stop();
    write(MUTED_KEY, String(next));
  };

  /** Switches voice and reads the question in it, so the difference is heard at once. */
  const choose = (key: string, sample?: { text: string; index: number }) => {
    setChosen(key);
    write(VOICE_KEY, key);
    if (sample) void sayQuestion(sample.text, sample.index, key);
  };

  return { supported, muted, setMuted, options, selected, choose, fallback, sayQuestion, stop };
}
