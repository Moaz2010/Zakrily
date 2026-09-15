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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openModal = () => setState("selecting");

  const startTimer = (minutes: number) => {
    const secs = minutes * 60;
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setState("running");
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("idle");
    setSecondsLeft(0);
  };

  useEffect(() => {
    if (state !== "running") return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setState("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
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
