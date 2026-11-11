import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API's recognition: Chrome, Edge and Safari have it (prefixed); Firefox doesn't.
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export const dictationSupported = () => recognitionConstructor() !== null;

/**
 * The fallback when a speech model fails: the browser's own recognition types what the candidate says
 * into the answer. Nothing is recorded, so these answers get no delivery judgement.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const deliver = useRef(onText);
  deliver.current = onText;

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor || recognition.current) return;
    const instance = new Constructor();
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = "en-US";
    instance.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]!;
        if (result.isFinal) deliver.current(result[0].transcript.trim());
      }
    };
    instance.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error === "not-allowed" ? "Microphone access is blocked." : "Your browser's speech recognition stopped working. Type your answer instead.");
      }
    };
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = instance;
    setError(null);
    setListening(true);
    instance.start();
  }, []);

  useEffect(() => () => recognition.current?.stop(), []);

  return { supported: dictationSupported(), listening, error, start, stop };
}
