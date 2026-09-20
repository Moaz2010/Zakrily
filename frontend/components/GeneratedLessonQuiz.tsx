"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { generatedQuizApi, type GeneratedQuizRun, type GeneratedQuizState, type QuizSkill } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import { subjectTheme } from "@/lib/subject-theme";
import styles from "./GeneratedLessonQuiz.module.css";

const SKILLS: Record<QuizSkill, string> = {
  memorization: "التذكر", comprehension: "الفهم", application: "التطبيق", analysis: "التحليل",
};

function errorMessage(error: unknown) {
  const detail = (error as { body?: { detail?: unknown } })?.body?.detail;
  return typeof detail === "string" ? detail : "تعذر الاتصال. حاول مرة أخرى، إجاباتك محفوظة على هذا الجهاز.";
}

export function GeneratedLessonQuiz({ subject, lessonId }: { subject: string; lessonId: number }) {
  const { user, refresh } = useLearner();
  const [state, setState] = useState<GeneratedQuizState | null>(null);
  const [run, setRun] = useState<GeneratedQuizRun | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const working = useRef(false);
  const alive = useRef(true);
  const draftKey = (id: number) => `generated-quiz:${user.id}:${lessonId}:${id}`;

  function select(next: GeneratedQuizRun) {
    setRun(next); setIndex(0); setError("");
    let saved: Record<number, string> = {};
    try {
      const stored = JSON.parse(localStorage.getItem(draftKey(next.id)) ?? "{}");
      if (stored && typeof stored === "object") for (const q of next.questions) {
        if (typeof stored[q.id] === "string" && Object.hasOwn(q.options, stored[q.id])) saved[q.id] = stored[q.id];
      }
    } catch { /* Storage may be unavailable. The quiz still works. */ }
    setAnswers(saved);
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const data = await generatedQuizApi.state(lessonId);
      if (!alive.current) return;
      setState(data);
      const quizzes = data.runs.filter(r => !r.skill);
      const next = quizzes.find(r => !r.result) ?? quizzes.at(-1);
      if (next) select(next);
    } catch (e) { if (alive.current) setError(errorMessage(e)); }
    finally { if (alive.current) setLoading(false); }
  }

  useEffect(() => {
    alive.current = true;
    void load();
    return () => { alive.current = false; };
    // This component is keyed by lesson and mounted inside the authenticated layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user.id]);

  function remember(qid: number, answer: string) {
    const next = { ...answers, [qid]: answer };
    setAnswers(next);
    if (run) try { localStorage.setItem(draftKey(run.id), JSON.stringify(next)); } catch { /* Optional draft. */ }
  }

  function merge(next: GeneratedQuizRun) {
    setState(previous => {
      const runs = [...(previous?.runs.filter(r => r.id !== next.id) ?? []), next].sort((a, b) => a.id - b.id);
      return { runs, attempts_used: runs.filter(r => !r.skill).length, max_attempts: 3 };
    });
  }

  async function start(skill?: QuizSkill) {
    if (working.current) return;
    working.current = true; setBusy(true); setError("");
    try {
      const next = await generatedQuizApi.start(lessonId, skill, skill ? run?.id : undefined);
      if (alive.current) { merge(next); select(next); }
    } catch (e) { if (alive.current) setError(errorMessage(e)); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }

  async function submit() {
    if (!run || working.current) return;
    working.current = true; setBusy(true); setError("");
    try {
      const next = await generatedQuizApi.submit(lessonId, run.id, run.questions.map(q => ({ question_id: q.id, answer: answers[q.id] ?? "" })));
      if (alive.current) {
        merge(next); setRun(next);
        try { localStorage.removeItem(draftKey(next.id)); } catch { /* Optional draft. */ }
        void refresh();
      }
    } catch (e) { if (alive.current) setError(errorMessage(e)); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }

  const question = run?.questions[index];
  const result = run?.result;
  const answered = run?.questions.filter(q => answers[q.id]).length ?? 0;
  const quizzes = state?.runs.filter(r => !r.skill) ?? [];
  return <main className={styles.page} style={subjectTheme(subject)} dir="rtl">
    <header className={styles.header}>
      <Link href={`/lessons/${subject}/${lessonId}`}>← العودة للدرس</Link>
      <span className={styles.eyebrow}>كل محاولة خطوة لقدّام</span>
      <h1>{run?.skill ? `تدريب ${SKILLS[run.skill]}` : "اختبر نفسك ✨"}</h1>
      <p>أسئلة من درسك، ونتيجة تساعدك تعرف تراجع إيه.</p>
    </header>
    <div className={styles.content}>
      {loading && <p role="status">جاري تحميل محاولاتك…</p>}
      {error && <div className={styles.error} role="alert"><p>{error}</p>{!state && <button onClick={() => void load()}>حاول مرة أخرى</button>}</div>}
      {busy && <p role="status" className={styles.notice}>{run && !run.result ? "جاري تجهيز النتيجة أو الأسئلة…" : "بنجهز أسئلة من محتوى الدرس… قد يستغرق ده دقيقة."}</p>}
      {state && <p className={styles.meta}>المحاولات: {state.attempts_used} / ٣ · تدريب المهارات لا يستهلك محاولة اختبار</p>}
      {!loading && state && !run && <section className={styles.panel}>
        <span className={styles.heroIcon} aria-hidden="true">✦</span><h2>جاهز تشوف اتعلمت إيه؟</h2>
        <p>من ١٠ إلى ٢٠ سؤال اختيار من متعدد من نفس أفكار ومستوى الدرس، موزّعة على التذكر والفهم والتطبيق والتحليل.</p>
        <p>عندك ٣ محاولات. تقدر تكمل المحاولة المفتوحة، وتشوف التصحيح بعد ما تجاوب على كل الأسئلة. لو التوليد فشل، مش هنحسب محاولة.</p>
        <button className={styles.primary} disabled={busy} onClick={() => void start()}>ولّد الاختبار وابدأ</button>
      </section>}
      {run && !result && question && <section className={styles.panel} aria-label="أسئلة الاختبار">
        <div className={styles.row}><span>السؤال {index + 1} من {run.questions.length}</span><span className={styles.badge}>{SKILLS[question.skill_tag]}</span></div>
        <progress max={run.questions.length} value={answered} aria-label="الأسئلة المجابة" />
        <h2 dir="auto">{question.body}</h2>
        <fieldset className={styles.options} disabled={busy}><legend className={styles.srOnly}>اختر الإجابة</legend>
          {Object.entries(question.options).map(([key, value]) => <label key={`${question.id}-${key}`} className={answers[question.id] === key ? styles.selected : ""}>
            <input type="radio" name={`question-${question.id}`} checked={answers[question.id] === key} onChange={() => remember(question.id, key)} />
            <span dir="auto">{value}</span>
          </label>)}
        </fieldset>
        <div className={styles.navigation}>
          <button disabled={busy || index === 0} onClick={() => setIndex(i => i - 1)}>السابق</button>
          {index < run.questions.length - 1 ? <button className={styles.primary} disabled={busy} onClick={() => setIndex(i => i + 1)}>التالي</button>
            : <button className={styles.primary} disabled={busy || answered !== run.questions.length} onClick={() => void submit()}>إنهاء وعرض النتيجة</button>}
        </div>
        <p className={styles.meta}>أجبت عن {answered} من {run.questions.length} — أكمل كل الأسئلة لعرض النتيجة.</p>
        <div className={styles.dots} aria-label="انتقل لسؤال">{run.questions.map((q, i) => <button key={q.id} disabled={busy} aria-label={`السؤال ${i + 1}${answers[q.id] ? "، تمت الإجابة" : ""}`} aria-current={index === i ? "step" : undefined} className={answers[q.id] ? styles.filled : ""} onClick={() => setIndex(i)}>{i + 1}</button>)}</div>
      </section>}
      {run && result && <>
        <section className={styles.panel} aria-label="نتيجة الاختبار">
          <span className={styles.eyebrow}>{run.skill ? "نتيجة التدريب" : `نتيجة المحاولة ${run.attempt}`}</span>
          <h2>أحسنت، خلّصت {run.skill ? "التدريب" : "الاختبار"}!</h2>
          <strong className={styles.score}>{Math.round(result.score * 100)}٪</strong><p>{result.correct} إجابات صحيحة من {result.total}</p>
          <div className={result.motivation_points ? styles.success : styles.notice} role="status">{result.motivation_message ?? "كمّل المحاولة! راجع الإجابات وجرّب تاني 💪"}</div>
          {!run.skill && <div className={styles.notice}>{result.weakest_skills.length ? <><b>المهارات الأكثر احتياجًا للتدريب في المحاولة دي:</b><p>{result.weakest_skills.map(s => SKILLS[s]).join("، ")}</p></> : "ممتاز! جاوبت صح في كل المهارات. تقدر تتدرّب أكتر تحت."}</div>}
          <div className={styles.skills}>{result.skill_breakdown.map(item => <div key={item.skill_tag} className={styles.skill}>
            <div className={styles.row}><b>{SKILLS[item.skill_tag]}</b><span>{item.correct} / {item.total} · {Math.round(item.accuracy * 100)}٪</span></div>
            <progress max={item.total} value={item.correct} aria-label={SKILLS[item.skill_tag]} />
            {!run.skill && <button disabled={busy} onClick={() => void start(item.skill_tag)}>{result.weakest_skills.includes(item.skill_tag) ? "ابدأ هنا · " : ""}تدريب من ١٠ إلى ٢٠ سؤال</button>}
          </div>)}</div>
          {!run.skill && state && state.attempts_used < 3 && <button className={styles.primary} disabled={busy} onClick={() => void start()}>ابدأ المحاولة التالية · {3 - state.attempts_used} متبقية</button>}
          {!run.skill && state?.attempts_used === 3 && <p className={styles.notice}>أنهيت محاولات الاختبار الثلاث. تدريب المهارات متاح لك.</p>}
          {run.skill && <button className={styles.primary} disabled={busy} onClick={() => { const parent = quizzes.find(q => q.id === run.quiz_id); if (parent) select(parent); }}>العودة لنتائج الاختبار</button>}
        </section>
        <section className={styles.panel}><h2>راجع إجاباتك</h2>{run.questions.map((q, i) => {
          const feedback = result.results.find(r => r.question_id === q.id)!;
          return <details className={styles.review} key={q.id}><summary>{feedback.is_correct ? "✓" : "✗"} السؤال {i + 1} · {SKILLS[q.skill_tag]} · {feedback.is_correct ? "صحيح" : "راجع الإجابة"}</summary>
            <p dir="auto">{q.body}</p><p>إجابتك: <bdi>{q.options[feedback.given_answer]}</bdi></p>
            {!feedback.is_correct && <p>الإجابة الصحيحة: <bdi>{q.options[feedback.correct_answer]}</bdi></p>}
            <p dir="auto">{feedback.explanation}</p>
          </details>;
        })}</section>
      </>}
      {!!state?.runs.length && <section className={styles.history}><h2>اختباراتك وتدريباتك المحفوظة</h2>{state.runs.map(q => <button key={q.id} disabled={busy} onClick={() => select(q)}>{q.skill ? `تدريب ${SKILLS[q.skill]}` : `المحاولة ${q.attempt}`} · {q.result ? `${Math.round(q.result.score * 100)}٪` : "أكمل من هنا"}</button>)}</section>}
    </div>
  </main>;
}
