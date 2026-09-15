"use client";
/**
 * /lessons — subject selection grid.
 * Taps a subject → goes to learning path /lessons/[subject].
 */
import Link from "next/link";

const SUBJECTS = [
  { slug: "english", ar: "اللغة الإنجليزية", en: "English", bg: "#2A4A6B", emoji: "🇬🇧" },
  { slug: "math",    ar: "الرياضيات",        en: "Math",    bg: "#6B2A28", emoji: "➕" },
  { slug: "science", ar: "العلوم",           en: "Science", bg: "#1E5C4A", emoji: "🔬" },
];

export default function LessonsIndexPage() {
  return (
    <div className="min-h-screen bg-[#0E0E0E] px-4 pt-12">
      <h1 className="text-white font-black text-2xl text-end mb-6">اختر مادة</h1>
      <div className="flex flex-col gap-4">
        {SUBJECTS.map((s) => (
          <Link key={s.slug} href={`/lessons/${s.slug}`}>
            <div
              className="rounded-2xl p-6 flex items-center justify-between"
              style={{ backgroundColor: s.bg }}
            >
              <span className="text-4xl">{s.emoji}</span>
              <div className="text-end">
                <p className="text-white font-black text-xl">{s.ar}</p>
                <p className="text-white/60 text-sm">{s.en}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
