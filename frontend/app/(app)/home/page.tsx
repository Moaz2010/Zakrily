"use client";
/**
 * Home screen — updated per user specifications:
 *   1. Header: Two separate pill elements (Left: 🔥20, Right: Avatar far right + text right-aligned)
 *   2. Weekly activity chart: Light background (#F0EDE6), title right-aligned, 23->28 left-to-right, 4-tier colored segments
 *   3. Exam reminder card: Dark background, mascot-calendar on LEFT, text on RIGHT right-aligned
 *   4. Subject cards: Horizontally scrollable row, reduced width (~25-30%) so 3rd card peeks at right edge
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { subjectsApi, type SubjectOut } from "@/lib/api";

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
    label: "علوم", nextLesson: "الفضاء",
    progress: 87, accuracy: 87, total: 4, completed: 1,
  },
  math: {
    bg: "bg-[#6B2A28]", ring: "#C0504A",
    label: "الرياضيات", nextLesson: "الكسور",
    progress: 55, accuracy: 55, total: 4, completed: 3,
  },
  english: {
    bg: "bg-[#2A4A6B]", ring: "#3A6A8B",
    label: "إنجليزي", nextLesson: "الحواس الخمس",
    progress: 70, accuracy: 70, total: 3, completed: 2,
  },
};

export default function HomePage() {
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);

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
    <div className="flex flex-col gap-4 bg-[#0E0E0E] min-h-screen px-4 pt-6">

      {/* ── Step 1: Header (Two separate pills, RTL aligned inside) ───────── */}
      <header className="flex items-center justify-between gap-3" dir="ltr">
        {/* Left pill: Flame icon + streak number */}
        <div className="flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3.5 py-2 shadow-sm flex-shrink-0 border border-white/5">
          <span className="text-lg">🔥</span>
          <span className="font-bold text-white text-sm">20</span>
        </div>

        {/* Right pill: Name + grade stacked and right-aligned, Avatar at far right */}
        <div className="flex items-center justify-end gap-3 rounded-2xl bg-[#1A1A1A] px-4 py-2 shadow-sm flex-1 border border-white/5">
          <div className="text-right">
            <p className="font-bold text-white text-sm sm:text-base leading-tight">سلمى مدحت</p>
            <p className="text-[#9A9A9A] text-xs">رابعة ابتدائي</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#2A2A2A] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#8A8A8A]" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
        </div>
      </header>

      {/* ── Step 2: Weekly activity chart card ───────────────────────────── */}
      <section className="rounded-2xl bg-[#F0EDE6] p-4 shadow-sm">
        {/* Title hugging the right edge */}
        <p className="text-right text-[#1A1A1A] font-bold text-base mb-3">نشاط الأسبوع</p>
        
        {/* Bar chart: 23 → 28 ascending left to right */}
        <div className="flex items-end justify-between gap-2 h-28 px-1" dir="ltr">
          {WEEK_CHART.map((item) => (
            <div key={item.day} className="flex flex-col items-center flex-1 h-full">
              {/* Background capsule track */}
              <div className="w-full flex-1 rounded-md bg-[#E2DED4] flex flex-col-reverse p-1 gap-1 overflow-hidden">
                {item.segments.map((color, idx) => (
                  <div
                    key={idx}
                    style={{ backgroundColor: color }}
                    className="w-full h-4 rounded-[3px] flex-shrink-0"
                  />
                ))}
              </div>
              <span className="text-[#2A2A2A] text-xs font-semibold mt-1.5">{item.day}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Step 3: Exam reminder card ───────────────────────────────────── */}
      <section className="relative rounded-2xl bg-[#1A1A1A] overflow-hidden p-4 flex items-center justify-between gap-3 shadow-sm border border-white/5" dir="ltr">
        {/* Mascot on the LEFT */}
        <div className="w-24 h-24 flex-shrink-0 relative flex items-end justify-center">
          <img
            src="/mascot-calendar.png"
            alt="تذكير الامتحان"
            className="w-full h-full object-contain object-bottom scale-110 translate-y-1"
          />
        </div>

        {/* Text on the RIGHT, right-aligned, wrapping across up to 3 lines */}
        <div className="flex-1 text-right">
          <p className="text-white font-bold text-lg sm:text-xl leading-snug">
            باقي ٣ أيام على<br />
            امتحان العلوم، يلا<br />
            نراجع
          </p>
        </div>
      </section>

      {/* ── Step 5: Subject cards (horizontally scrollable, reduced width) ── */}
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
