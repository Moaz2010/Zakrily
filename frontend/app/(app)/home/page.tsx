"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { subjectsApi, type SubjectOut } from "@/lib/api";
import { curriculumSubjects, getSubject } from "@/lib/curriculum";
import { HomeOverview } from "./HomeOverview";
import styles from "./home.module.css";

// ── Weekly activity data matching reference ──────────────────────────────────
// Ascending left to right: 23 → 24 → 25 → 26 → 27 → 28
// Colors bottom-to-top:
//   Bottom: dark red/maroon (#B05B54)
//   Second: gray (#6E7A7D)
//   Third:  teal green (#4A7C6D)
//   Top:    purple/lavender (#7A7CD6) — only on peak days 25, 26
const WEEK_CHART = [
  { day: "23", segments: ["#B05B54", "#6E7A7D"] },
  { day: "24", segments: ["#B05B54", "#6E7A7D", "#4A7C6D"] },
  { day: "25", segments: ["#B05B54", "#6E7A7D", "#4A7C6D", "#7A7CD6"] },
  { day: "26", segments: ["#B05B54", "#6E7A7D", "#4A7C6D", "#7A7CD6"] },
  { day: "27", segments: ["#B05B54", "#6E7A7D"] },
  { day: "28", segments: ["#B05B54"] },
];

// ── Subject card config (keeping colors/style as built) ───────────────────────
const SUBJECT_CONFIG: Record<string, {
  bg: string; ring: string; label: string; nextLesson: string;
  progress: number; accuracy: number; total: number; completed: number;
}> = {
  science: {
    bg: "bg-[#1E5C4A]", ring: "#2D8A6A",
    label: "علوم", nextLesson: getSubject("science")!.lessons[0].title,
    progress: 0, accuracy: 0, total: getSubject("science")!.lessons.length, completed: 0,
  },
  math: {
    bg: "bg-[#6B2A28]", ring: "#C0504A",
    label: "الرياضيات", nextLesson: getSubject("math")!.lessons[0].title,
    progress: 0, accuracy: 0, total: getSubject("math")!.lessons.length, completed: 0,
  },
  english: {
    bg: "bg-[#2A4A6B]", ring: "#3A6A8B",
    label: "إنجليزي", nextLesson: getSubject("english")!.lessons[0].title,
    progress: 0, accuracy: 0, total: getSubject("english")!.lessons.length, completed: 0,
  },
};

export default function HomePage() {
  const [subjects, setSubjects] = useState<SubjectOut[]>(curriculumSubjects);

  useEffect(() => {
    subjectsApi.list().then(setSubjects).catch(console.error);
  }, []);

  const science = subjects.find((s) => s.slug === "science");
  const math    = subjects.find((s) => s.slug === "math");
  const english = subjects.find((s) => s.slug === "english");

  const displaySubjects = [
    science && { ...SUBJECT_CONFIG.science, id: science.id, slug: "science" },
    math    && { ...SUBJECT_CONFIG.math,    id: math.id,    slug: "math" },
    english && { ...SUBJECT_CONFIG.english, id: english.id, slug: "english" },
  ].filter(Boolean) as Array<typeof SUBJECT_CONFIG.science & { id: number; slug: string }>;

  return (
    <div className={styles.page}>
      <HomeOverview week={WEEK_CHART} />

      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth" dir="ltr">
        {displaySubjects.map((sub) => (
          <Link key={sub.slug} href={`/lessons/${sub.slug}`} className="flex-shrink-0 w-[155px]">
            <div className={`${sub.bg} rounded-2xl p-3.5 flex flex-col justify-between min-h-[290px] shadow-md`}>
              {/* Top info */}
              <div>
                <p className="text-white font-bold text-end text-base">{sub.label}</p>
                <p className="text-white/70 text-xs text-end mt-0.5 truncate">التالي: {sub.nextLesson}</p>
              </div>

              {/* Circular progress */}
              <div className="flex items-center justify-center my-2">
                <CircleProgress value={sub.accuracy} color={sub.ring} />
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-1 my-1">
                {["مفهوم الدرس", "تمارين", "مراجعة الوحدة"].map((item, i) => (
                  <div key={i} className="flex items-center justify-end gap-1.5">
                    <span className="text-white/80 text-[11px]">{item}</span>
                    <div className={`h-2.5 w-2.5 rounded-[2px] ${i === 0 ? "bg-white" : "bg-white/30"} flex items-center justify-center`}>
                      {i === 0 && (
                        <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none" stroke="black" strokeWidth={1.5}>
                          <path d="M2 5l2 2 4-4" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress fraction */}
              <p className="text-white/60 text-[11px] text-end">{sub.completed}/{sub.total} 📚</p>

              {/* View lessons button */}
              <div className="rounded-xl bg-black/25 py-1.5 px-2 flex items-center justify-center gap-1.5 mt-1">
                {/* RTL: arrow icon — mirror for RTL */}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white [transform:scaleX(-1)]" fill="none"
                     stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-white text-xs font-semibold">عرض الدروس</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

// ── Circular progress ring ────────────────────────────────────────────────────
function CircleProgress({ value, color }: { value: number; color: string }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={56} height={56} className="-rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-white font-bold text-xs">{value}%</span>
    </div>
  );
}
