"use client";
import Link from "next/link";
import { percentage, StatsStatus, useLearner } from "@/lib/learner-context";
import { HomeOverview } from "./HomeOverview";
import styles from "./home.module.css";

const COLORS: Record<string, { bg: string; ring: string }> = {
  science: { bg: "#1E5C4A", ring: "#2D8A6A" },
  math: { bg: "#6B2A28", ring: "#C0504A" },
  english: { bg: "#2A4A6B", ring: "#3A6A8B" },
};

export default function HomePage() {
  const { stats } = useLearner();
  return <div className={styles.page}>
    <HomeOverview />
    <StatsStatus />
    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth" dir="ltr">
      {stats?.subjects.map((subject) => {
        const colors = COLORS[subject.slug];
        const progress = subject.total_lessons ? subject.completed_lessons / subject.total_lessons * 100 : 0;
        return <Link key={subject.id} href={`/lessons/${subject.slug}`} className="flex-shrink-0 w-[155px]">
          <div style={{ backgroundColor: colors.bg }} className="rounded-2xl p-3.5 flex flex-col justify-between min-h-[290px] shadow-md">
            <div><p className="text-white font-bold text-end text-base">{subject.name_ar}</p><p className="text-white/70 text-xs text-end mt-0.5 line-clamp-2">{subject.next_lesson ? `التالي: ${subject.next_lesson.title}` : subject.total_lessons ? "أكملت كل الدروس" : "لا توجد دروس بعد"}</p></div>
            <div className="flex items-center justify-center my-2"><CircleProgress value={subject.accuracy} color={colors.ring} /></div>
            <p className="text-white/80 text-xs text-center">متوسط الدقة</p>
            <p className="text-white/60 text-[11px] text-end my-2">{subject.completed_lessons}/{subject.total_lessons} دروس مكتملة 📚</p>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden" role="progressbar" aria-label="تقدم المادة" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-white/70" style={{ width: `${progress}%` }} /></div>
            <div className="rounded-xl bg-black/25 py-1.5 px-2 text-center mt-3"><span className="text-white text-xs font-semibold">عرض الدروس</span></div>
          </div>
        </Link>;
      })}
    </div>
  </div>;
}

function CircleProgress({ value, color }: { value: number | null; color: string }) {
  const circumference = 2 * Math.PI * 24;
  return <div className="relative flex items-center justify-center">
    <svg width={56} height={56} className="-rotate-90" aria-hidden="true">
      <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
      <circle cx={28} cy={28} r={24} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${(value ?? 0) * circumference} ${circumference}`} strokeLinecap="round" />
    </svg>
    <span className="absolute text-white font-bold text-xs">{percentage(value)}</span>
  </div>;
}
