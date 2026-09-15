"use client";
/**
 * Lesson detail screen — matches design image 4.
 *
 * Tabs: شرح (explain) | تدريب (practice) | امتحان (exam) | اختبار (test)
 * Cards:
 *   - اختبار  (dark / full-width): quiz with question count + time
 *   - تدريب ذكي (teal half): smart practice
 *   - بطاقات تسميع (dusty rose half): listening cards
 */
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const TABS = ["شرح", "تدريب", "امتحان", "اختبار"] as const;
type Tab = (typeof TABS)[number];

const SUBJECT_LABELS: Record<string, { ar: string; bg: string }> = {
  english: { ar: "إنجليزي", bg: "#2A4A6B" },
  math:    { ar: "رياضيات", bg: "#6B2A28" },
  science: { ar: "علوم",    bg: "#1E5C4A" },
};

export default function LessonDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const subject  = params.subject as string;
  const lessonId = params.lessonId as string;
  const config   = SUBJECT_LABELS[subject] ?? { ar: subject, bg: "#1E5C4A" };

  const [activeTab, setActiveTab] = useState<Tab>("شرح");

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: config.bg }} className="px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="mb-2 text-white/80">
          {/* RTL: mirror icon */}
          <svg viewBox="0 0 24 24" className="h-6 w-6 [transform:scaleX(-1)]"
               fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-black text-3xl text-end">{config.ar}</h1>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-[#D4813A]" style={{ width: "42%" }} />
          </div>
          <span className="text-white/70 text-xs">42%</span>
          <span className="text-white/70 text-xs bg-white/10 rounded px-2 py-0.5">
            📚 4 وحدات
          </span>
        </div>
      </div>

      {/* ── Unit / lesson title ─────────────────────────────────────────── */}
      <div className="bg-white px-5 pt-4 pb-2 border-b border-gray-100">
        <div className="text-end">
          <p className="text-[#9A9A9A] text-sm">الدرس 5</p>
          <h2 className="text-black font-black text-2xl">الوحدة 2</h2>
        </div>

        {/* Tab row */}
        <div className="flex gap-1 mt-3 justify-end overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                activeTab === tab
                  ? "bg-[#1E5C4A] text-white"
                  : "bg-gray-100 text-gray-500",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Activity cards ──────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-5 flex flex-col gap-3">

        {/* Quiz card — full width, dark */}
        <Link href={`/lessons/${subject}/${lessonId}/quiz`}>
          <div className="rounded-2xl bg-[#1C1C1C] p-5 flex items-center justify-between">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/10">
              {/* RTL: mirror icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white [transform:scaleX(-1)]"
                   fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
            <div className="text-end">
              <p className="text-white font-black text-2xl">اختبار</p>
              <p className="text-[#9A9A9A] text-sm mt-1">جاهز تختبر فهمك؟<br />5 أسئلة • 3 دقائق</p>
            </div>
          </div>
        </Link>

        {/* Bottom two cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Smart practice — teal */}
          <Link href={`/lessons/${subject}/${lessonId}/practice`}>
            <div className="rounded-2xl bg-[#1E5C4A] p-4 flex flex-col justify-between min-h-32 relative overflow-hidden">
              {/* Decorative circle */}
              <div className="absolute -bottom-4 -start-4 h-20 w-20 rounded-full bg-white/10" />
              <div className="flex justify-end">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  {/* RTL: mirror icon */}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white [transform:scaleX(-1)]"
                       fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
              <div className="text-end">
                <p className="text-white font-black text-lg leading-tight">تدريب<br />ذكي</p>
              </div>
            </div>
          </Link>

          {/* Listening cards — dusty rose */}
          <div className="rounded-2xl bg-[#8B4A4A] p-4 flex flex-col justify-between min-h-32 relative overflow-hidden">
            <div className="absolute -bottom-4 -end-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="flex justify-end">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                {/* RTL: mirror icon */}
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white [transform:scaleX(-1)]"
                     fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
            <div className="text-end">
              <p className="text-white font-black text-lg leading-tight">بطاقات<br />تسميع</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
