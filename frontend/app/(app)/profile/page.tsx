"use client";
/**
 * Profile screen (حسابي) — matches design image 5.
 *
 * Sections:
 *   1. Dark header: settings cog, mascot, name, grade
 *   2. Stats row: accuracy card (dark) + streak card (dark)
 *   3. "الأداء حسب المادة" — per-subject rows with circular % and label
 */
import { useEffect, useState } from "react";
import { skillsApi, type SkillScoreOut } from "@/lib/api";

// Per-subject performance (from mock — real data from BE-07+)
const SUBJECT_PERFORMANCE = [
  { label: "الرياضيات", pct: 87, grade: "ممتاز",        gradeColor: "#2D8A6A" },
  { label: "علوم",      pct: 55, grade: "محتاج مراجعة", gradeColor: "#D4813A" },
  { label: "انجليزي",   pct: 23, grade: "سيء",           gradeColor: "#B84040" },
];

export default function ProfilePage() {
  const [skills, setSkills] = useState<SkillScoreOut[]>([]);

  useEffect(() => {
    skillsApi.mySkills().then(setSkills).catch(console.error);
  }, []);

  const avgAccuracy = skills.length
    ? Math.round(skills.reduce((s, sk) => s + sk.accuracy * 100, 0) / skills.length)
    : 78;

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0E0E]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative bg-[#1C1C1C] pt-12 pb-6 px-5">
        {/* Settings cog */}
        <button className="absolute top-12 start-4 text-[#6A6A6A]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none"
               stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Mascot + name */}
        <div className="flex flex-col items-end gap-2">
          <div className="h-28 w-28">
            <img src="/mascot.png" alt=""
                 className="h-full w-full object-contain"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="text-end">
            <h1 className="text-white font-black text-3xl">سلمى مدحت</h1>
            <p className="text-[#9A9A9A] text-sm">رابعة ابتدائي</p>
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        {/* Accuracy */}
        <div className="rounded-2xl bg-[#1C1C1C] p-4 text-end">
          <p className="text-[#9A9A9A] text-xs mb-1">متوسط الدقة</p>
          <p className="text-white font-black text-3xl">{avgAccuracy}%</p>
        </div>
        {/* Streak */}
        <div className="rounded-2xl bg-[#1C1C1C] p-4 flex items-center justify-end gap-3">
          <div className="text-end">
            <p className="text-white font-black text-3xl">20</p>
          </div>
          <span className="text-4xl">🔥</span>
        </div>
      </div>

      {/* ── Performance by subject ───────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <h2 className="text-white font-bold text-lg text-end mb-3">الأداء حسب المادة</h2>
        <div className="flex flex-col gap-3">
          {SUBJECT_PERFORMANCE.map((sub) => (
            <div key={sub.label}
                 className="rounded-2xl bg-[#1C1C1C] px-4 py-3 flex items-center justify-between">
              {/* Grade label */}
              <span className="text-sm font-semibold" style={{ color: sub.gradeColor }}>
                {sub.grade}
              </span>

              {/* Progress bar + subject name */}
              <div className="flex flex-col items-end gap-1 flex-1 mx-4">
                <p className="text-white font-bold text-base">{sub.label}</p>
                <div className="w-full h-2 rounded-full bg-[#2A2A2A]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${sub.pct}%`, backgroundColor: sub.gradeColor }}
                  />
                </div>
              </div>

              {/* Circular % */}
              <div className="relative flex items-center justify-center">
                <svg width={52} height={52} className="-rotate-90">
                  <circle cx={26} cy={26} r={20} fill="none"
                          stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
                  <circle cx={26} cy={26} r={20} fill="none"
                          stroke={sub.gradeColor} strokeWidth={5}
                          strokeDasharray={`${(sub.pct / 100) * (2 * Math.PI * 20)} ${2 * Math.PI * 20}`}
                          strokeLinecap="round" />
                </svg>
                <span className="absolute text-white font-bold text-xs">{sub.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
