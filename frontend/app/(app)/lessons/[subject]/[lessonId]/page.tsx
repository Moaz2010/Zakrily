"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { lessonsApi, subjectsApi, type LessonDetailOut, type PathNodeOut } from "@/lib/api";
import { getSubject } from "@/lib/curriculum";
import { TrainingActivities } from "@/components/TrainingActivities";
import { LessonChat } from "@/components/LessonChat";
import { ScienceLearn } from "@/components/ScienceLearn";
import { EnglishLearn } from "@/components/EnglishLearn";
import { MathLearn } from "@/components/MathLearn";
import { MathLearn2 } from "@/components/MathLearn2";
import { LessonQuestions } from "@/components/LessonQuestions";
import { GenericLearn } from "@/components/GenericLearn";
import styles from "./lesson.module.css";

const COLORS: Record<string, string> = { science: "#527f76", math: "#996963", english: "#597b96" };
const LABELS: Record<string, string> = { science: "علوم", math: "رياضيات", english: "إنجليزي" };

export default function LessonDetailPage() {
  const { subject, lessonId } = useParams<{ subject: string; lessonId: string }>();
  const [mode, setMode] = useState<"lesson" | "practice" | "questions">("lesson");
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

  return (
    <div className={styles.page} style={{ "--subject-color": COLORS[subject] } as CSSProperties}>
      {/* Compact top bar */}
      <div className={styles.topBar}>
        <div className={styles.topMeta}>
          <span className={styles.topSubject}>{LABELS[subject]}</span>
          <span className={styles.topLesson} dir="ltr" lang="en">{detail.lesson.title ?? lesson.title}</span>
        </div>
        {lesson.status !== "locked" && (
          <div className={styles.tabs} role="group" aria-label="نوع النشاط">
            <button onClick={() => setMode("lesson")} aria-pressed={mode === "lesson"}>📖 شرح</button>
            {subject === "math" && <button onClick={() => setMode("questions")} aria-pressed={mode === "questions"}>أسئلة</button>}
            <button onClick={() => setMode("practice")} aria-pressed={mode === "practice"}>✎ تدريبات</button>
          </div>
        )}
        <Link href={`/lessons/${subject}`} className={styles.back} aria-label="العودة لمسار التعلم">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m15 4-8 8 8 8" /></svg>
        </Link>
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {lesson.status === "locked" ? (
          <div className={styles.locked}>
            <p>أكمل الدرس السابق لفتح هذا الدرس.</p>
            <Link href={`/lessons/${subject}`}>العودة لمسار التعلم</Link>
          </div>
        ) : mode === "questions" ? (
          <LessonQuestions key={lesson.lesson_id} lessonId={lesson.lesson_id} subject={subject} />
        ) : mode === "practice" ? (
          <TrainingActivities subject={subject} lessonId={lesson.lesson_id} lessonActivity={subject === "math" || subject === "science" || (subject === "english" && lesson.order === 1)} />
        ) : subject === "science" && detail.sections.length > 0 ? (
          <ScienceLearn key={`learn-${lesson.lesson_id}`} sections={detail.sections} lessonId={lesson.lesson_id} onProgress={() => { subjectsApi.path(subject).then(setNodes).catch(() => {}); }} onCompletePractice={() => setMode("practice")} />
        ) : subject === "english" && lesson.order === 1 ? (
          <EnglishLearn key={`learn-${lesson.lesson_id}`} lessonId={lesson.lesson_id} onProgress={() => { subjectsApi.path(subject).then(setNodes).catch(() => {}); }} onCompletePractice={() => setMode("practice")} />
        ) : subject === "math" && lesson.order === 1 ? (
          <MathLearn key={`learn-${lesson.lesson_id}`} lessonId={lesson.lesson_id} onProgress={() => { subjectsApi.path(subject).then(setNodes).catch(() => {}); }} onCompletePractice={() => setMode("practice")} />
        ) : subject === "math" && lesson.order === 2 ? (
          <MathLearn2 key={`learn2-${lesson.lesson_id}`} lessonId={lesson.lesson_id} onProgress={() => { subjectsApi.path(subject).then(setNodes).catch(() => {}); }} onCompletePractice={() => setMode("practice")} />
        ) : (
          <GenericLearn key={`generic-${lesson.lesson_id}`} sections={detail.sections} onCompletePractice={() => setMode("practice")} />
        )}
      </div>

      {lesson.status !== "locked" && (
        <LessonChat
          key={`chat-${lesson.lesson_id}`}
          lessonId={lesson.lesson_id}
          subject={subject}
          lessonTitle={detail.lesson.title ?? lesson.title}
        />
      )}
    </div>
  );
}

