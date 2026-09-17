"use client";

import { useEffect, useState, type ReactNode } from "react";
import { lessonsApi } from "@/lib/api";
import { LessonQuestions } from "./LessonQuestions";
import { StudySessionHeader } from "./StudySessionHeader";
import { subjectTheme } from "@/lib/subject-theme";
import styles from "./StudySession.module.css";

/** Keep existing quiz/practice links on the same saved lesson activity. */
export function ScienceActivityRoute({
  lessonId, practice, fallback, subject = "science",
}: {
  lessonId: number; practice: boolean; fallback: ReactNode; subject?: string;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setSupported(null);
    lessonsApi.activity(lessonId)
      .then((data) => { if (active) setSupported((data.total ?? 0) > 0); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [lessonId, retry]);
  if (failed)
    return (
      <div className="p-6 text-center" role="alert" dir="rtl">
        <p className="text-sm text-[#774b48] font-bold mb-3">
          تعذر تحميل أفكار وأسئلة هذا الدرس. يرجى المحاولة مرة أخرى.
        </p>
        <button
          className="bg-[#527f76] hover:bg-[#3d655d] text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all border-b-4 border-b-[#345e53] cursor-pointer"
          onClick={() => setRetry(retry + 1)}
        >
          إعادة المحاولة 🔄
        </button>
      </div>
    );
  if (supported === null) return <p role="status" className="p-6" dir="rtl">جاري تحميل أسئلة الدرس…</p>;
  if (!supported) return fallback;
  return (
    <div className={styles.page} style={subjectTheme(subject)}>
      <StudySessionHeader subject={subject} lessonId={lessonId} practice={practice} />
      <LessonQuestions key={lessonId} lessonId={lessonId} initialPractice={practice} subject={subject} />
    </div>
  );
}
