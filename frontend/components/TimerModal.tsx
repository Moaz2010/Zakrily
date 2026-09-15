"use client";
/**
 * TimerModal — the green dial screen (image 2).
 * Opens when the play button is tapped.
 * User drags/taps a value (5, 10, 15, 20, 25 min) then confirms.
 *
 * RTL: logical spacing throughout.
 */
import { useState } from "react";
import { useTimer } from "@/lib/timer-context";

const OPTIONS = [5, 10, 15, 20, 25];

export function TimerModal() {
  const { state, startTimer, stopTimer } = useTimer();
  const [selected, setSelected] = useState(15);

  if (state !== "selecting") return null;

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0E0E0E]"
         style={{ maxWidth: 430, margin: "0 auto" }}>

      {/* Top spacer */}
      <div className="flex-1" />

      {/* Mascot + speech bubble */}
      <div className="relative flex flex-col items-center px-6">
        {/* Speech bubble */}
        <div className="mb-4 rounded-2xl bg-[#1C1C1C] px-6 py-4 text-center shadow-lg">
          <p className="text-2xl font-bold leading-snug text-white">
            يلا بينا،<br />هنذاكر قد ايه النهاردة؟
          </p>
        </div>

        {/* Mascot placeholder — user will add image to /public */}
        <div className="h-48 w-48">
          {/* RTL: mirror icon — mascot image, no transform needed (character, not arrow) */}
          <img
            src="/mascot.png"
            alt="mascot"
            className="h-full w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>

      {/* Green dial arc */}
      <div className="relative w-full" style={{ height: 260 }}>
        {/* Arc background SVG */}
        <svg
          viewBox="0 0 430 260"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Outer arc fill */}
          <path
            d="M -20 260 Q 215 -60 450 260 Z"
            fill="#2D7A5E"
          />
          {/* Inner cutout */}
          <path
            d="M 40 260 Q 215 20 390 260 Z"
            fill="#0E0E0E"
          />
        </svg>

        {/* Minute options along the arc */}
        <div className="absolute inset-0 flex items-end justify-around pb-8 px-6">
          {OPTIONS.map((min) => (
            <button
              key={min}
              onClick={() => setSelected(min)}
              className={[
                "flex flex-col items-center gap-1 transition-all",
                selected === min ? "scale-125" : "opacity-60",
              ].join(" ")}
            >
              {selected === min && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
              <span className={[
                "font-bold",
                selected === min ? "text-white text-xl" : "text-[#9A9A9A] text-base",
              ].join(" ")}>
                {min}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <div className="flex w-full gap-3 px-6 pb-10">
        <button
          onClick={() => stopTimer()}
          className="flex-1 rounded-2xl border border-[#2D2D2D] py-4 text-[#9A9A9A] font-semibold"
        >
          إلغاء
        </button>
        <button
          onClick={() => startTimer(selected)}
          className="flex-[2] rounded-2xl bg-[#2D8A6A] py-4 font-bold text-white text-lg"
        >
          ابدأ {selected} دقيقة
        </button>
      </div>
    </div>
  );
}
