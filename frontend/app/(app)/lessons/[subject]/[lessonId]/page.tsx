"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { lessonsApi, subjectsApi, type LessonDetailOut, type PathNodeOut } from "@/lib/api";
import { getSubject } from "@/lib/curriculum";
import { TrainingActivities } from "@/components/TrainingActivities";
import styles from "../path.module.css";

const COLORS: Record<string, string> = { science: "#527f76", math: "#996963", english: "#597b96" };
const LABELS: Record<string, string> = { science: "علوم", math: "رياضيات", english: "إنجليزي" };

export default function LessonDetailPage() {
  const { subject, lessonId } = useParams<{ subject: string; lessonId: string }>();
  const [mode, setMode] = useState<"lesson" | "practice">("lesson");
  const [detail, setDetail] = useState<LessonDetailOut | null>(null);
  const [nodes, setNodes] = useState<PathNodeOut[]>([]);
  const [failed, setFailed] = useState(false);
  const curriculum = getSubject(subject);
  const lesson = curriculum?.lessons.find((item) => item.id === Number(lessonId));

  useEffect(() => {
    let active = true;
    setDetail(null);
    setFailed(false);
    setNodes([]);
    lessonsApi.get(Number(lessonId)).then((data) => { if (active) setDetail(data); }).catch(() => { if (active) setFailed(true); });
    subjectsApi.path(subject).then((data) => { if (active) setNodes(data); }).catch(() => {});
    return () => { active = false; };
  }, [lessonId, subject]);

  if (!curriculum || !lesson) return <div className="p-6"><h1>الدرس غير موجود</h1><Link href="/lessons" className="underline">العودة للمواد</Link></div>;
  const progress = nodes.length ? Math.round(nodes.filter((node) => node.status === "completed").length / nodes.length * 100) : 0;

  return <div className={styles.page} style={{ "--subject-color": COLORS[subject] } as CSSProperties}>
    <header className={styles.header}>
      <div className={styles.headerPetals} aria-hidden="true"><img src="/petals-cross.png" alt="" /><img src="/petals-diagonal.png" alt="" /></div>
      <div className={styles.headingRow}><h1>{LABELS[subject]}</h1><Link href={`/lessons/${subject}`} className={styles.back} aria-label="العودة لمسار التعلم"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m15 4-8 8 8 8" /></svg></Link></div>
      <div className={styles.summary}><div className={styles.count}><span aria-hidden="true">📖</span><div><strong>{curriculum.unit_ar}</strong><small>{curriculum.lessons.length} دروس</small></div></div><div className={styles.progressWrap}><span>{nodes.length ? `${progress}٪` : "—"}</span><div className={styles.progress} role="progressbar" aria-label="تقدم المادة" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div></div></div>
    </header>
    <section className={styles.unit}>
      <div className={styles.unitRow}><div><h2>{curriculum.unit_ar}</h2><p>الدرس {lesson.order}</p></div><div className={styles.tabs} role="group" aria-label="نوع النشاط"><button onClick={() => setMode("lesson")} aria-pressed={mode === "lesson"}>📖 شرح</button><button onClick={() => setMode("practice")} aria-pressed={mode === "practice"}>✎ تدريبات</button></div></div>
      <p className={styles.unitTitle} dir="ltr" lang="en">{detail?.lesson.title ?? lesson.title}</p>
    </section>
    {mode === "practice" ? <TrainingActivities subject={subject} lessonId={lesson.id} /> : <section className="px-5 py-6 text-sm leading-7">
      {failed ? <p role="alert">تعذر تحميل الدرس. <Link href={`/lessons/${subject}`} className="underline">العودة للمسار</Link></p> : !detail ? <p role="status">جاري التحميل…</p> : detail.sections.length ? detail.sections.map((section) => <article key={section.id} className="mb-4 rounded-2xl bg-[#eeeee9] p-4" dir="auto"><h3 className="font-bold">{section.heading}</h3><p className="whitespace-pre-wrap">{section.body_md}</p></article>) : <p className="rounded-2xl bg-[#eeeee9] p-4">تمت إضافة الدرس إلى المنهج. شرح الدرس سيكون متاحًا قريبًا.</p>}
    </section>}
  </div>;
}
