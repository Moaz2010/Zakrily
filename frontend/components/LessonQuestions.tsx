"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lessonsApi, type ActivityState, type ActivityQuestion } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import { subjectTheme } from "@/lib/subject-theme";
import styles from "./StudySession.module.css";

const labels: Record<string, string> = {
  memorization: "تذكر (Remembering)",
  comprehension: "فهم (Understanding)",
  application: "تطبيق (Applying ideas)",
  analysis: "تحليل واستنتاج (Reasoning)",
};

/** Helper to generate clear, concise bilingual explanations for children with line breaks */
function formatChildExplanation(
  rawExplanation?: string,
  isCorrect?: boolean,
  correctAnswerText?: string
): { english: string; arabic: string } {
  let rawEng = (rawExplanation || "").replace(/[*#]/g, "").trim();

  if (!rawEng) {
    rawEng = isCorrect
      ? "Great job! You selected the correct answer based on the lesson content."
      : `The correct answer is: ${correctAnswerText || "the option marked above"}.`;
  }

  // Break English sentences onto separate lines if connected for maximum clarity
  const english = rawEng
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .join("\n\n");

  const engLower = rawEng.toLowerCase();
  let arabic = "";

  if (isCorrect) {
    arabic = "ممتاز يا بطل! إجابتك مظبوطة جداً ودقيقة بناءً على شرح الدرس.";
  } else if (engLower.includes("living") || engLower.includes("organism")) {
    arabic = "الكائنات الحية تتغذى وتنمو وتتنفس (مثل الإنسان والحيوان والنبات)، بينما الجمادات لا تفعل ذلك.";
  } else if (engLower.includes("habitat") || engLower.includes("shelter")) {
    arabic = "الموئل هو المكان الآمن الذي يعيش فيه الكائن الحي ويجد فيه الطعام والماء والمأوى المناسب.";
  } else if (engLower.includes("damp") || engLower.includes("stones") || engLower.includes("rocks")) {
    arabic = "تختبئ الكائنات في الأماكن الباردة والرطبة تحت الصخور لتجنب حرارة الشمس الشديدة.";
  } else if (engLower.includes("sense") || engLower.includes("taste") || engLower.includes("hear") || engLower.includes("see")) {
    arabic = "الحواس الخمس تساعدنا على فهم العالم من حولنا والحفاظ على سلامتنا في كل وقت.";
  } else {
    arabic = `الإجابة الصحيحة هي "${correctAnswerText || "المحددة أعلاه"}" لأنها الإجابة الأدق والمطابقة للشرح المكتوب في الدرس.`;
  }

  return { english, arabic };
}

export function LessonQuestions({
  lessonId,
  initialPractice = false,
  subject = "science",
}: {
  lessonId: number;
  initialPractice?: boolean;
  subject?: string;
}) {
  const { user, refresh } = useLearner();
  const [data, setData] = useState<ActivityState | null>(null);
  const [practice, setPractice] = useState(initialPractice);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<ActivityQuestion | null>(null);
  const [draftStatus, setDraftStatus] = useState("");
  const draftRequest = useRef<Promise<unknown>>(Promise.resolve());
  const question = data?.questions[0];

  const userId = user?.id ?? 1;

  const draftKey = useCallback(
    (item: ActivityQuestion) =>
      `lesson-answer:${userId}:${lessonId}:${item.id}:${practice ? item.previous_attempt_id : "quiz"}`,
    [userId, lessonId, practice]
  );

  const restoredAnswer = useCallback(
    (next: ActivityState) => {
      const item = next?.questions?.[0];
      if (!item) return "";
      const drafts = next?.drafts ?? {};
      try {
        return localStorage.getItem(draftKey(item)) ?? drafts[String(item.id)] ?? "";
      } catch {
        return drafts[String(item.id)] ?? "";
      }
    },
    [draftKey]
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const next = await lessonsApi.activity(lessonId, practice);
      const safeNext: ActivityState = {
        ...next,
        total: next?.total ?? 0,
        answered: next?.answered ?? 0,
        score: next?.score ?? null,
        learned_steps: next?.learned_steps ?? [],
        questions: Array.isArray(next?.questions) ? next.questions : [],
        drafts: next?.drafts ?? {},
      };
      setData(safeNext);
      setChecked(null);
      setAnswer(restoredAnswer(safeNext));
    } catch {
      setError("تعذر تحميل تقدمك المحفوظ. يرجى المحاولة مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }, [lessonId, practice, restoredAnswer]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!question || checked || practice || !answer) return;
    const timer = setTimeout(() => saveDraft(answer), 500);
    return () => clearTimeout(timer);
  }, [answer, question?.id, checked, practice]);

  function editAnswer(value: string) {
    setAnswer(value);
    if (question) {
      try {
        localStorage.setItem(draftKey(question), value);
      } catch {
        /* Server draft saving remains available. */
      }
    }
  }

  function saveDraft(value: string) {
    if (!question || practice) return;
    const id = question.id;
    setDraftStatus("جاري حفظ المسودة…");
    draftRequest.current = draftRequest.current
      .catch(() => {})
      .then(() => lessonsApi.saveActivity(lessonId, { draft: { question_id: id, answer: value } }))
      .then(() => setDraftStatus("تم حفظ المسودة ✓"))
      .catch(() => setDraftStatus("تعذر حفظ المسودة. تحقق من الاتصال."));
  }

  async function submit() {
    if (!question || !answer.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await draftRequest.current;
      const next = await lessonsApi.answerActivity(lessonId, {
        question_id: question.id,
        answer,
        practice,
        previous_attempt_id: question.previous_attempt_id,
      });
      setChecked(question);
      setData(next);
      try {
        localStorage.removeItem(draftKey(question));
      } catch {
        /* Server sync available. */
      }
      setDraftStatus("");
      void refresh();
    } catch {
      setError("تعذر حفظ الإجابة. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    setChecked(null);
    setAnswer(data ? restoredAnswer(data) : "");
  }

  async function restartQuestions() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await lessonsApi.restartActivity(lessonId);
      setPractice(false);
      setData(next);
      setChecked(null);
      setAnswer("");
      setDraftStatus("");
    } catch {
      setError("تعذر بدء المراجعة. تقدمك محفوظ، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={styles.content}
      style={subjectTheme(subject)}
      dir="rtl"
      aria-label="أسئلة وتدريبات الدرس"
    >
      <div className={styles.navigation}>
        <button
          className={practice ? styles.secondary : styles.primary}
          aria-pressed={!practice}
          disabled={busy}
          onClick={() => setPractice(false)}
        >
          📖 أسئلة الدرس (Lesson Questions)
        </button>
        <button
          className={practice ? styles.primary : styles.secondary}
          aria-pressed={practice}
          disabled={busy}
          onClick={() => setPractice(true)}
        >
          🎯 تدريب المهارات (Skill Practice)
        </button>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button onClick={() => void load()}>إعادة المحاولة</button>
        </div>
      )}

      {!data && !error && <p role="status">جاري تحميل أسئلتك المحفوظة…</p>}

      {data && (
        <>
          <div className={styles.counter}>
            <span>
              {data.answered} من {data.total} أسئلة مجابة
            </span>
            <strong>
              {data.score == null ? "لا يوجد تقييم بعد" : `الدقة: ${Math.round(data.score * 100)}٪`}
            </strong>
          </div>

          <div
            className={styles.progress}
            role="progressbar"
            aria-label="التقدم في الأسئلة"
            aria-valuenow={data.answered}
            aria-valuemax={data.total || 1}
            aria-valuemin={0}
          >
            <div
              style={{
                width: `${data.total ? (data.answered / data.total) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Answer Check Result View */}
          {checked ? (
            <div
              className={`${styles.result} ${
                data.reflection_saved
                  ? ""
                  : data.feedback?.is_correct
                  ? styles.correctFeedback
                  : styles.incorrectFeedback
              }`}
              aria-live="polite"
              dir="rtl"
            >
              {!data.reflection_saved && (
                <span className={styles.feedbackEmoji} aria-hidden="true">
                  {data.feedback?.is_correct ? "🎉" : "💡"}
                </span>
              )}
              <h3 className="text-xl font-black mb-1">
                {data.reflection_saved
                  ? "تم حفظ تفكيرك ✨"
                  : data.feedback?.is_correct
                  ? "ممتاز جداً! إجابة صحيحة (Correct!)"
                  : "محاولة جيدة!"}
              </h3>

              {!data.reflection_saved && !data.feedback?.is_correct && (
                <p className="text-sm text-[#536b62] font-semibold mb-3">
                  ولا يهمك يا بطل! تعال نعرف ليه غلط مع بعض ✨
                </p>
              )}

              <p className="font-bold text-sm text-[#292c32] mb-3" dir="ltr" lang="en">
                {checked.body}
              </p>

              {data.reflection_saved ? (
                <p>هذا السؤال مخصص لاستكشاف الفكرة والتفكير الشخصي.</p>
              ) : (
                <div className="space-y-3 my-3 text-right">
                  {/* Given Answer */}
                  <div className="p-3.5 rounded-xl bg-white/90 border border-[#d8ddd6]">
                    <span className="font-black text-xs text-[#536b62] block mb-1">
                      👤 إجابتك (Your Answer):
                    </span>
                    <span className="font-bold text-sm text-[#292c32]" dir="auto">
                      {(checked.options?.[data.feedback?.given_answer ?? ""] as string) ??
                        data.feedback?.given_answer}
                    </span>
                  </div>

                  {/* Correct Answer */}
                  <div className="p-3.5 rounded-xl bg-white border-2 border-[#527f76]">
                    <span className="font-black text-xs text-[#1e5c4a] block mb-1">
                      ✅ الإجابة النموذجية الصحيحة (Model Answer):
                    </span>
                    <span className="font-bold text-sm text-[#1e5c4a]" dir="auto">
                      {(checked.options?.[data.feedback?.correct_answer ?? ""] as string) ??
                        data.feedback?.correct_answer}
                    </span>
                  </div>

                  {/* Child-friendly Bilingual Explanation with sentence linebreaks */}
                  {(() => {
                    const exp = formatChildExplanation(
                      data.feedback?.explanation,
                      data.feedback?.is_correct,
                      (checked.options?.[data.feedback?.correct_answer ?? ""] as string) ??
                        data.feedback?.correct_answer
                    );
                    return (
                      <div className="p-4 rounded-xl bg-[#edf3e7] border border-[#c4cebf] text-xs leading-relaxed space-y-2">
                        <strong className="block text-[#1e5c4a] font-black text-sm">
                          🔍 الشرح والتوضيح للأبطال (Explanation):
                        </strong>

                        <div className="p-3 bg-white/90 rounded-lg text-[#292c32]">
                          <span className="font-bold text-[#527f76] block mb-1">
                            بالعربي:
                          </span>
                          <p className="font-semibold text-sm leading-relaxed">{exp.arabic}</p>
                        </div>

                        <div className="p-3 bg-white/90 rounded-lg text-[#3d655d]" dir="ltr" lang="en">
                          <span className="font-bold text-[#527f76] block mb-1" dir="rtl">
                            English Explanation:
                          </span>
                          <p className="font-medium text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {exp.english}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <button className={styles.primary} onClick={nextQuestion}>
                السؤال التالي 🚀
              </button>
            </div>
          ) : question ? (
            <div className={styles.questions} dir="rtl">
              <div className={styles.counter}>
                <span>سؤال {question.number}</span>
                <span>{labels[question.skill_tag]}</span>
              </div>

              {/* Question Body */}
              <h3 className={styles.question} dir="ltr" lang="en">
                {question.body}
              </h3>

              {/* Display Picture ONLY for Lesson 1 Question 29 */}
              {lessonId === 12 && question.number === 29 && (
                <div className="my-3 rounded-2xl overflow-hidden border-2 border-[#527f76]/30 shadow-xs max-w-xl mx-auto bg-white">
                  <img
                    src="/question29.jpg"
                    alt="Exploration Steps Picture (Guess, Search, Record)"
                    className="w-full h-auto object-cover max-h-72"
                  />
                  <p className="text-xs text-center py-2 bg-[#edf3e7] text-[#1e5c4a] font-bold" dir="rtl">
                    🖼️ توضيح بالصور: خطوات الاستكشاف الثلاث (1. Guess  2. Search  3. Record)
                  </p>
                </div>
              )}

              {question.options ? (
                <div className="flex flex-col gap-3 my-3">
                  {Object.entries(question.options).map(([key, value]) => (
                    <button
                      key={key}
                      disabled={busy}
                      aria-pressed={answer === key}
                      className={`${styles.option} ${answer === key ? styles.selected : ""}`}
                      onClick={() => {
                        editAnswer(key);
                        saveDraft(key);
                      }}
                      dir="ltr"
                    >
                      {String(value)}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  aria-label="إجابتك"
                  className={styles.input}
                  rows={3}
                  disabled={busy}
                  value={answer}
                  maxLength={4000}
                  onChange={(event) => editAnswer(event.target.value)}
                  onBlur={() => saveDraft(answer)}
                  placeholder="اكتب إجابتك هنا…"
                />
              )}

              <p role="status" className={styles.muted}>
                {draftStatus}
              </p>

              <div className={styles.navigation}>
                <button
                  className={styles.primary}
                  disabled={busy || !answer.trim()}
                  onClick={() => void submit()}
                >
                  {busy ? "جاري الحفظ…" : "تحقق وحفظ الإجابة 🚀"}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.result} dir="rtl">
              <span className="text-4xl block mb-2" aria-hidden="true">🎉 🌟</span>
              <h3 className="text-xl font-black text-[#292c32] mb-2">
                {data.total === 0
                  ? "الأسئلة غير متاحة حالياً."
                  : practice
                  ? "ماشاء الله! لا توجد أسئلة تحتاج تدريباً إضافياً الآن 🌱"
                  : "أحسنت! تم إكمال وحفظ جميع أسئلة هذا الدرس! ✨"}
              </h3>
              {data.total > 0 && (
                <button
                  onClick={() => void restartQuestions()}
                  disabled={busy}
                  className="mt-3 bg-[#527f76] hover:bg-[#3d655d] text-white font-black px-5 py-2.5 rounded-xl text-sm transition-all border-b-4 border-b-[#345e53] cursor-pointer"
                >
                  {busy ? "جاري بدء المراجعة…" : "إعادة الأسئلة والمراجعة 🔄"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
