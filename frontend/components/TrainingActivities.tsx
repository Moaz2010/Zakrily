"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lessonsApi, type LessonSectionOut } from "@/lib/api";
import styles from "./TrainingActivities.module.css";

function Arrow() {
  return <span className={styles.arrow} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 6 6 6-6 6" /></svg></span>;
}

function Pattern() {
  return <svg className={styles.pattern} viewBox="0 0 220 220" fill="none" stroke="currentColor" strokeWidth="18" aria-hidden="true"><path d="M-30 205C100 245 64 80 156 45S258 150 191 142 64 67 94 14 180-6 166 46 17 46 30 126 112 183 104 134 19 92-20 143" /></svg>;
}

export function TrainingActivities({ subject, lessonId }: { subject: string; lessonId: number }) {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [flashcards, setFlashcards] = useState(false);
  const base = `/lessons/${subject}/${lessonId}`;

  useEffect(() => {
    let active = true;
    setQuestionCount(null);
    lessonsApi.quiz(lessonId).then((data) => { if (active) setQuestionCount(data.questions.length); }).catch(() => {});
    return () => { active = false; };
  }, [lessonId]);

  return <div className={styles.activities}>
    <ol className={styles.stages} aria-label="مراحل التعلم" dir="ltr">
      {["شرح", "تدريب", "اختبار", "امتحان"].map((label, i) => <li key={label} className={i === 2 ? styles.currentStage : ""}><span>{label}</span><i /></li>)}
    </ol>
    <Link href={`${base}/quiz`} className={`${styles.card} ${styles.quiz}`}>
      <Pattern /><h3>اختبار</h3>
      <div className={styles.quizFooter}><p>جاهز تختبر فهمك؟<br />{questionCount !== null ? `${questionCount} أسئلة` : "راجع اللي اتعلمته"}</p><Arrow /></div>
    </Link>
    <div className={styles.pair} dir="ltr">
      <Link href={`${base}/practice`} className={`${styles.card} ${styles.smart}`} dir="rtl"><Pattern /><h3>تدريب<br />ذكي</h3><Arrow /></Link>
      <button type="button" onClick={() => setFlashcards(true)} className={`${styles.card} ${styles.flash}`} dir="rtl"><Pattern /><h3>بطاقات<br />تسميع</h3><Arrow /></button>
    </div>
    {flashcards && <Flashcards lessonId={lessonId} onClose={() => setFlashcards(false)} />}
  </div>;
}

function Flashcards({ lessonId, onClose }: { lessonId: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sections, setSections] = useState<LessonSectionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    let active = true;
    lessonsApi.get(lessonId).then((data) => { if (active) setSections(data.sections); }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; element.close(); };
  }, [lessonId]);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="flashcards-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className={styles.dialogHeading}><h2 id="flashcards-title">بطاقات تسميع</h2><button onClick={onClose} aria-label="إغلاق البطاقات">×</button></div>
    {loading ? <p role="status">جاري تحميل البطاقات…</p> : failed ? <p role="alert">تعذر تحميل البطاقات. حاول مرة أخرى.</p> : !sections.length ? <p>بطاقات هذا الدرس ستكون متاحة قريبًا.</p> : <>
      <p>{index + 1} / {sections.length}</p><h3 dir="auto">{sections[index].heading}</h3>
      {revealed ? <p className={styles.answer} dir="auto">{sections[index].body_md}</p> : <button className={styles.reveal} onClick={() => setRevealed(true)}>إظهار الإجابة</button>}
      <div className={styles.pagination}><button disabled={index === 0} onClick={() => { setIndex(index - 1); setRevealed(false); }}>السابق</button><button disabled={index === sections.length - 1} onClick={() => { setIndex(index + 1); setRevealed(false); }}>التالي</button></div>
    </>}
  </dialog>;
}
