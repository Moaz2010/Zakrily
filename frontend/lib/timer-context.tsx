"use client";
/**
 * TimerContext — manages the study session timer state.
 *
 * States:
 *   idle      → play button shown in navbar
 *   selecting → TimerModal open (user choosing duration)
 *   running   → countdown active, navbar shows "MM:SS"
 *   done      → session ended
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { clampMinutes, remainingSeconds } from "./study-timer";

export type TimerState = "idle" | "selecting" | "running" | "done";

interface TimerCtx {
  state: TimerState;
  secondsLeft: number;
  totalSeconds: number;
  openModal: () => void;
  startTimer: (minutes: number) => void;
  stopTimer: () => void;
}

const Ctx = createContext<TimerCtx | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const deadlineRef = useRef<number | null>(null);

  const openModal = () => { if (state !== "running") setState("selecting"); };

  const startTimer = (minutes: number) => {
    const secs = clampMinutes(minutes) * 60;
    deadlineRef.current = Date.now() + secs * 1000;
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setState("running");
  };

  const stopTimer = () => {
    deadlineRef.current = null;
    setState("idle");
    setSecondsLeft(0);
    setTotalSeconds(0);
  };

  useEffect(() => {
    if (state !== "running") return;
    const tick = () => {
      if (deadlineRef.current === null) return;
      const remaining = remainingSeconds(deadlineRef.current);
      setSecondsLeft(remaining);
      if (remaining === 0) setState("done");
    };
    const interval = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state]);

  return (
    <Ctx.Provider value={{ state, secondsLeft, totalSeconds, openModal, startTimer, stopTimer }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimer must be inside TimerProvider");
  return ctx;
}

/** Format seconds as MM:SS */
export function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
