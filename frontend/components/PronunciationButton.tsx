"use client";

import { useEffect, useRef, useState } from "react";
import { selectEnglishVoice } from "@/lib/pronunciation";
import styles from "./PronunciationButton.module.css";

let stopCurrent: (() => void) | null = null;

export function PronunciationButton({ text }: { text: string; lessonId: number }) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => stopRef.current?.();
  }, [text]);

  function pronounce() {
    if (stopRef.current) {
      stopRef.current();
      return;
    }
    stopCurrent?.();
    setError("");

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError("Pronunciation is not supported by this browser.");
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selectEnglishVoice(synth.getVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = 0.85;

    let active = true;
    function stop() {
      if (!active) return;
      active = false;
      synth.cancel();
      stopRef.current = null;
      if (stopCurrent === stop) stopCurrent = null;
      setSpeaking(false);
    }

    stopRef.current = stop;
    stopCurrent = stop;
    setSpeaking(true);
    utterance.onend = stop;
    utterance.onerror = () => {
      stop();
      setError("Could not play pronunciation. Please try again.");
    };

    // Speak synchronously from the click handler so mobile autoplay policy
    // cannot reject playback after an API request.
    try {
      synth.speak(utterance);
    } catch {
      stop();
      setError("Could not play pronunciation. Please try again.");
    }
  }

  return (
    <span className={styles.control}>
      <button
        type="button"
        className={styles.button}
        onClick={pronounce}
        aria-label={speaking ? `Stop pronunciation of ${text}` : `Listen to ${text}`}
        aria-pressed={speaking}
        title={speaking ? "Stop pronunciation" : `Listen to pronunciation: ${text}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {speaking ? <path d="M16 9h5v6h-5z" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>}
        </svg>
      </button>
      {error && <span className={styles.error} role="status">{error}</span>}
    </span>
  );
}
