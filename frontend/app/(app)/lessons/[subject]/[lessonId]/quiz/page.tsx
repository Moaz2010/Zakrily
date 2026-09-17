"use client";

import { ScienceActivityRoute } from "@/components/ScienceActivityRoute";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { lessonsApi, type QuestionOut, type QuizSubmitResponse } from "@/lib/api";
import { percentage, useLearner } from "@/lib/learner-context";

import { StudySessionHeader } from "@/components/StudySessionHeader";
import { SessionEmpty } from "@/components/SessionEmpty";
import { subjectTheme } from "@/lib/subject-theme";
import styles from "@/components/StudySession.module.css";

export default function QuizPage() {
  const params = useParams();
  return params.subject === "science" || params.subject === "english"
    ? <ScienceActivityRoute subject={params.subject as string} lessonId={Number(params.lessonId)} practice={false} fallback={<LegacyQuizPage />} />
    : <LegacyQuizPage />;
}

function LegacyQuizPage() {
  const { refresh } = useLearner();
  const params = useParams();
  const router = useRouter();
  const subject = params.subject as string;
  const lessonId = Number(params.lessonId);

  const [questions, setQuestions] = useState<QuestionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    let active = true;
    lessonsApi
      .quiz(lessonId)
      .then((data) => {
        if (active) {
          setQuestions(data.questions);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message ?? "تعذر تحميل الاختبار");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [lessonId]);

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  function handleSelect(val: string) {
    if (!currentQ) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        answer: selectedAnswers[q.id] ?? "",
      }));
      const res = await lessonsApi.submitQuiz(lessonId, { answers: answersPayload });
      setResult(res);
      void refresh();
    } catch {
      setError("حدث خطأ أثناء إرسال الإجابات. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page} style={subjectTheme(subject)}>
      <StudySessionHeader subject={subject} lessonId={lessonId} practice={false} />

      <div className={styles.content}>
        {loading && (
          <div className={styles.loading}>
            <p className={styles.muted} role="status">جاري تحميل الأسئلة...</p>
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <p className="text-[#874c49] text-sm">{error}</p>
            <button
              onClick={() => router.back()}
              
            >
              العودة للدرس
            </button>
          </div>
        )}

        {/* ── Result View ───────────────────────────────────────────────── */}
        {result && (
          <div className={styles.result}>
            <div className="flex flex-col items-center justify-center my-2">
              <span className="text-5xl mb-2">🎉</span>
              <h2 className="text-2xl font-black text-[#292c32]">اكتمل الاختبار!</h2>
              <p className={styles.score}>
                {Math.round(result.score * 100)}%
              </p>
            </div>

            {/* Skill breakdown */}
            {result.skill_breakdown && result.skill_breakdown.length > 0 && (
              <div className={styles.breakdown}>
                <h3 className="font-bold text-[#292c32] text-sm mb-3">تفصيل المهارات</h3>
                <div className="flex flex-col gap-2">
                  {result.skill_breakdown.map((item) => (
                    <div
                      key={item.skill_tag}
                      className={styles.skillRow}
                    >
                      <span className="text-[#737c77]">
                        {item.correct}/{item.total} ({percentage(item.accuracy)})
                      </span>
                      <span className="text-[#292c32] font-medium">{item.skill_tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push(`/lessons/${subject}`)}
              className={styles.primary}
            >
              متابعة التعلم
            </button>
          </div>
        )}

        {/* ── Question View ─────────────────────────────────────────────── */}
        {!loading && !error && !result && !currentQ && <SessionEmpty subject={subject} lessonId={lessonId} />}
        {!loading && !error && !result && currentQ && (
          <div className={styles.questions}>
            <div>
              {/* Progress counter */}
              <div className={styles.counter}>
                <span>
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span className={styles.badge}>
                  {currentQ.skill_tag}
                </span>
              </div>

              {/* Progress bar */}
              <div className={styles.progress}>
                <div
                  
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question body */}
              <h2 className={styles.question}>
                {currentQ.body}
              </h2>

              {/* Options or text input */}
              {currentQ.qtype === "mcq" && currentQ.options ? (
                <div className="flex flex-col gap-3">
                  {Array.isArray(currentQ.options) ? (
                    currentQ.options.map((opt, i) => (
                      <button
                        key={i}
                        aria-pressed={selectedAnswers[currentQ.id] === String(opt)}
                        onClick={() => handleSelect(String(opt))}
                        className={[
                          styles.option,
                          selectedAnswers[currentQ.id] === String(opt)
                            ? styles.selected
                            : "",
                        ].join(" ")}
                      >
                        {String(opt)}
                      </button>
                    ))
                  ) : typeof currentQ.options === "object" ? (
                    Object.entries(currentQ.options as Record<string, string>).map(([key, opt]) => (
                      <button
                        key={key}
                        aria-pressed={selectedAnswers[currentQ.id] === key}
                        onClick={() => handleSelect(key)}
                        className={[
                          styles.option,
                          selectedAnswers[currentQ.id] === key
                            ? styles.selected
                            : "",
                        ].join(" ")}
                      >
                        {opt}
                      </button>
                    ))
                  ) : null}
                </div>
              ) : (
                <input
                  aria-label={currentQ.body}
                  type="text"
                  dir="rtl"
                  value={selectedAnswers[currentQ.id] ?? ""}
                  onChange={(e) => handleSelect(e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className={styles.input}
                />
              )}
            </div>

            {/* Navigation buttons */}
            <div className={styles.navigation}>
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className={styles.secondary}
                >
                  السابق
                </button>
              )}

              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={styles.primary}
                >
                  {submitting ? "جاري الإرسال..." : "إنهاء الاختبار"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className={styles.primary}
                >
                  التالي
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
