"use client";

import { useEffect, useRef, useState } from "react";
import { voiceApi } from "@/lib/api";
import { selectEnglishVoice } from "@/lib/pronunciation";
import styles from "./PronunciationButton.module.css";

// All buttons share playback so clicking another word stops the previous one.
let stopCurrent: (() => void) | null = null;

const audioCache = new Map<string, string[]>();
let retryServiceAfter = 0;

export function PronunciationButton({ text, lessonId }: { text: string; lessonId: number }) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Start loading device voices before the first click (some browsers load asynchronously).
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => stopRef.current?.();
  }, [text, lessonId]);

  async function pronounce() {
    if (stopRef.current) {
      stopRef.current();
      return;
    }
    stopCurrent?.();
    setError("");
    const controller = new AbortController();
    let player: HTMLAudioElement | null = null;
    let utterance: SpeechSynthesisUtterance | null = null;
    let active = true;

    function stop() {
      active = false;
      controller.abort();
      if (player) {
        player.onended = null;
        player.onerror = null;
        player.pause();
      }
      if (utterance) {
        utterance.onend = null;
        utterance.onerror = null;
        window.speechSynthesis.cancel();
        utterance = null;
      }
      stopRef.current = null;
      if (stopCurrent === stop) stopCurrent = null;
      setSpeaking(false);
      setLoading(false);
    }
    function failed(reason?: unknown) {
      if (!active) return;
      stop();
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "الصوت جاهز. اضغط على السماعة مرة أخرى للسماح بتشغيله."
        : "تعذر تشغيل الصوت. تأكد من توفر صوت إنجليزي على جهازك ثم حاول مرة أخرى.");
    }
    function playBrowserVoice() {
      if (!active) return;
      setLoading(false);
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        stop();
        setError("صوت المعلمة غير متاح حاليًا، ومتصفحك لا يدعم النطق البديل.");
        return;
      }
      const synth = window.speechSynthesis;
      utterance = new SpeechSynthesisUtterance(text);
      const voice = selectEnglishVoice(synth.getVoices());
      utterance.lang = voice?.lang ?? "en-US";
      if (voice) utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.onend = stop;
      utterance.onerror = (event) => {
        if (event.error === "not-allowed") {
          failed(new DOMException("Playback requires a click", "NotAllowedError"));
        } else {
          failed();
        }
      };
      try {
        synth.speak(utterance);
      } catch (reason) {
        failed(reason);
      }
    }
    function play(clips: string[], index = 0) {
      if (!active) return;
      if (index >= clips.length) {
        stop();
        return;
      }
      player = new Audio(`data:audio/wav;base64,${clips[index]}`);
      player.onended = () => play(clips, index + 1);
      player.onerror = failed;
      void player.play().catch(failed);
    }

    stopRef.current = stop;
    stopCurrent = stop;
    setSpeaking(true);
    setLoading(true);
    try {
      const key = `${lessonId}:${text}`;
      let clips = audioCache.get(key);
      if (!clips) {
        if (Date.now() < retryServiceAfter) {
          playBrowserVoice();
          return;
        }
        const result = await voiceApi.pronounce(lessonId, text, controller.signal);
        if (!active) return;
        clips = result.audio;
        if (!clips.length) throw new Error("No pronunciation audio");
        // Bound memory while keeping recently requested words ready to replay.
        if (audioCache.size >= 100) audioCache.delete(audioCache.keys().next().value!);
        audioCache.set(key, clips);
      }
      setLoading(false);
      play(clips);
    } catch (reason) {
      if (!active) return;
      const status = (reason as { status?: number } | null)?.status;
      if (status === 401 || status === 403) {
        stop();
        setError("سجّل الدخول وافتح الدرس لتشغيل النطق.");
        return;
      }
      // Recover from missing configuration, service outages, and connection failures.
      // Subsequent clicks speak immediately during this brief cooldown.
      retryServiceAfter = Date.now() + 60_000;
      playBrowserVoice();
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
        aria-busy={loading}
        title={speaking ? "إيقاف النطق" : `اسمع النطق: ${text}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          {speaking ? <path d="M16 9h5v6h-5z" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>}
        </svg>
      </button>
      {loading && <span role="status" dir="rtl">جاري تجهيز النطق…</span>}
      {error && <span className={styles.error} role="status" dir="rtl">{error}</span>}
    </span>
  );
}
