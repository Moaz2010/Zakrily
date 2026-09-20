"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rewardsApi } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import { useTimer } from "@/lib/timer-context";

export function StudyRewards() {
  const pathname = usePathname();
  const { user, refreshRewards } = useLearner();
  const { state } = useTimer();
  const studying = state === "running" || /^\/(lessons|practice|quiz)(\/|$)/.test(pathname);

  useEffect(() => {
    let busy = false;
    let disposed = false;
    let points: number | null = null;
    const pulse = async () => {
      if (busy || disposed) return;
      busy = true;
      try {
        const result = await rewardsApi.study(studying && document.visibilityState === "visible");
        if (!disposed && result.points !== points) {
          points = result.points;
          void refreshRewards();
        }
      } catch { /* Offline gaps are excluded by the server. */ }
      finally { busy = false; }
    };
    void pulse();
    const timer = studying ? window.setInterval(() => void pulse(), 15_000) : undefined;
    document.addEventListener("visibilitychange", pulse);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", pulse);
    };
  }, [studying, user.id, refreshRewards]);

  return null;
}
