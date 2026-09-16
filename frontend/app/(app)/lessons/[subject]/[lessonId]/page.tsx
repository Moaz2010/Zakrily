"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { lessonsApi, subjectsApi, type LessonDetailOut, type PathNodeOut } from "@/lib/api";
import { getSubject } from "@/lib/curriculum";
import { TrainingActivities } from "@/components/TrainingActivities";
import { ScienceLessonChat } from "@/components/ScienceLessonChat";
import { ScienceLearn } from "@/components/ScienceLearn";
import { GenericLearn } from "@/components/GenericLearn";
import { percentage } from "@/lib/learner-context";
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
  const lesson = nodes.find((item) => item.lesson_id === Number(lessonId));

  useEffect(() => {
    let active = true;
    setDetail(null);
    setFailed(false);
    setNodes([]);
    Promise.all([lessonsApi.get(Number(lessonId)), subjectsApi.path(subject)])
      .then(([data, path]) => {
        if (active) {
          setDetail(data); setNodes(path);
          if (!path.some((node) => node.lesson_id === Number(lessonId))) setFailed(true);
        }
      }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [lessonId, subject]);

  if (!curriculum || failed) return <div className="p-6" role="alert"><h1>تعذر تحميل الدرس</h1><Link href="/lessons" className="underline">العودة للمواد</Link></div>;
  if (!detail || !lesson) return <p className="p-6" role="status">جاري تحميل الدرس…</p>;
  const progress = nodes.length ? Math.round(nodes.reduce((total, node) => total + (node.progress ?? (node.status === "completed" ? 1 : 0)), 0) / nodes.length * 100) : 0;

  return <div className={styles.page} style={{ "--subject-color": COLORS[subject] } as CSSProperties}>
    <header className={styles.header}>
      <div className={styles.headerPetals} aria-hidden="true"><img src="/petals-cross.png" alt="" /><img src="/petals-diagonal.png" alt="" /></div>
      <div className={styles.headingRow}><h1>{LABELS[subject]}</h1><Link href={`/lessons/${subject}`} className={styles.back} aria-label="العودة لمسار التعلم"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m15 4-8 8 8 8" /></svg></Link></div>
      <div className={styles.summary}><div className={styles.count}><span aria-hidden="true">📖</span><div><strong>{curriculum.unit_ar}</strong><small>{nodes.length} دروس</small><small>أفضل نتيجة: {percentage(lesson.score)}</small></div></div><div className={styles.progressWrap}><span>{nodes.length ? `${progress}٪` : "—"}</span><div className={styles.progress} role="progressbar" aria-label="تقدم المادة" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div></div></div>
    </header>
    <section className={styles.unit}>
      <div className={styles.unitRow}><div><h2>{curriculum.unit_ar}</h2><p>الدرس {lesson.order}</p></div><div className={styles.tabs} role="group" aria-label="نوع النشاط"><button onClick={() => setMode("lesson")} aria-pressed={mode === "lesson"}>📖 شرح</button><button onClick={() => setMode("practice")} aria-pressed={mode === "practice"}>✎ تدريبات</button></div></div>
      <p className={styles.unitTitle} dir="ltr" lang="en">{detail?.lesson.title ?? lesson.title}</p>
    </section>
    {lesson.status === "locked" ? (
      <p className="p-6">أكمل الدرس السابق لفتح هذا الدرس.</p>
    ) : mode === "practice" ? (
      <TrainingActivities subject={subject} lessonId={lesson.lesson_id} scienceLesson={subject === "science"} />
    ) : subject === "science" && detail.sections.length > 0 ? (
      <ScienceLearn key={`learn-${lesson.lesson_id}`} sections={detail.sections} lessonId={lesson.lesson_id} onProgress={() => { subjectsApi.path(subject).then(setNodes).catch(() => {}); }} onCompletePractice={() => setMode("practice")} />
    ) : (
      <GenericLearn key={`generic-${lesson.lesson_id}`} sections={detail.sections} onCompletePractice={() => setMode("practice")} />
    )}
    {lesson.status !== "locked" && mode === "lesson" && (
      <ScienceLessonChat
        key={`chat-${lesson.lesson_id}`}
        lessonId={lesson.lesson_id}
        sections={detail.sections}
        subject={subject}
        lessonTitle={detail?.lesson.title ?? lesson.title}
      />
    )}
  </div>;
}
