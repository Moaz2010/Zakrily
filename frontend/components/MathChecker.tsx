"use client";
import { useEffect, useRef, useState } from "react";
import { lessonsApi, mathApi, type QuestionOut } from "@/lib/api";
import styles from "./SubjectFeature.module.css";

export function MathChecker({ lessonId, onClose }: { lessonId: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [questions, setQuestions] = useState<QuestionOut[]>([]);
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof mathApi.check>> | null>(null);
  useEffect(() => {
    let active = true;
    const el = dialog.current!; el.showModal();
    lessonsApi.quiz(lessonId).then(data => { if (active) { setQuestions(data.questions); setSelected(data.questions[0]?.id ?? 0); } }).catch(() => { if (active) setError("تعذّر تحميل المسائل. اقفل وافتح المصحّح تاني."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; el.close(); };
  }, [lessonId]);
  const question = questions.find(q => q.id === selected);
  return <dialog ref={dialog} className={styles.dialog} dir="rtl" aria-labelledby="math-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <header className={styles.header}><h2 id="math-title">مصحّح الرياضيات</h2><button className={styles.close} onClick={onClose} aria-label="إغلاق المصحّح">×</button></header>
    <p className={styles.status}>اختار مسألة من الدرس، واكتب إجابتك النهائية علشان نراجعها.</p>
    {loading ? <p role="status">جاري تحميل المسائل…</p> : !questions.length ? <p>مفيش مسائل متاحة للدرس ده حاليًا.</p> : <form className={styles.form} onSubmit={async e => {
      e.preventDefault(); if (busy || !answer.trim()) return;
      setBusy(true); setError(""); setResult(null);
      try { setResult(await mathApi.check(lessonId, selected, answer.trim())); } catch { setError("تعذّر التصحيح. جرّب تاني."); } finally { setBusy(false); }
    }}>
      <label>المسألة<select disabled={busy} value={selected} onChange={e => { setSelected(Number(e.target.value)); setResult(null); setAnswer(""); }}>{questions.map((q, i) => <option key={q.id} value={q.id}>مسألة {i + 1}</option>)}</select></label>
      <p className={styles.message} dir="auto">{question?.body}</p>
      {question?.options && <div dir="auto">{Object.entries(question.options).map(([key, value]) => <p key={key}>{key}: {String(value)}</p>)}</div>}
      <label>إجابتك النهائية<textarea required maxLength={2000} dir="auto" disabled={busy} value={answer} onChange={e => { setAnswer(e.target.value); setResult(null); }} placeholder={question?.qtype === "mcq" ? "اكتب رمز الاختيار الصحيح" : "اكتب الإجابة هنا"} /></label>
      <button className={styles.primary} disabled={busy || !answer.trim()}>{busy ? "بنراجع إجابتك…" : "صحّح إجابتي"}</button>
    </form>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {result && <div className={styles.message} role="status"><strong>{result.is_correct ? "✓ برافو! إجابتك صح" : "راجع إجابتك مع الحل"}</strong><p dir="auto">الإجابة الصحيحة: {result.correct_answer}</p><p dir="auto">{result.explanation}</p></div>}
  </dialog>;
}
