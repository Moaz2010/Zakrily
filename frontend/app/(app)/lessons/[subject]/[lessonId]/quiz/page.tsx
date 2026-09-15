"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { lessonsApi, type QuestionOut, type QuizSubmitResponse } from "@/lib/api";

const SUBJECT_LABELS: Record<string, { ar: string; bg: string }> = {
  english: { ar: "إنجليزي", bg: "#2A4A6B" },
  math: { ar: "رياضيات", bg: "#6B2A28" },
  science: { ar: "علوم", bg: "#1E5C4A" },
};

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const subject = params.subject as string;
  const lessonId = Number(params.lessonId);
  const config = SUBJECT_LABELS[subject] ?? { ar: subject, bg: "#1E5C4A" };

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
        given_answer: selectedAnswers[q.id] ?? "",
      }));
      const res = await lessonsApi.submitQuiz(lessonId, { answers: answersPayload });
      setResult(res);
    } catch {
      setError("حدث خطأ أثناء إرسال الإجابات. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0E0E0E] text-white">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: config.bg }} className="px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="mb-2 text-white/80">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 [transform:scaleX(-1)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-black text-2xl text-end">اختبار: {config.ar}</h1>
        <p className="text-white/70 text-sm text-end mt-1">الدرس {lessonId}</p>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col max-w-lg mx-auto w-full">
        {loading && (
          <div className="flex items-center justify-center flex-1">
            <p className="text-white/60 text-sm">جاري تحميل الأسئلة...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-950/40 border border-red-500/30 p-4 text-end">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-3 text-xs bg-red-800/40 px-3 py-1.5 rounded-lg text-white"
            >
              العودة للدرس
            </button>
          </div>
        )}

        {/* ── Result View ───────────────────────────────────────────────── */}
        {result && (
          <div className="rounded-2xl bg-[#1A1A1A] p-6 border border-white/5 flex flex-col gap-5 text-end">
            <div className="flex flex-col items-center justify-center my-2">
              <span className="text-5xl mb-2">🎉</span>
              <h2 className="text-2xl font-black text-white">اكتمل الاختبار!</h2>
              <p className="text-4xl font-extrabold text-[#2D8A6A] mt-2">
                {Math.round(result.score > 1 ? result.score : result.score * 100)}%
              </p>
            </div>

            {/* Skill breakdown */}
            {result.skill_breakdown && result.skill_breakdown.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h3 className="font-bold text-white/90 text-sm mb-3">تفصيل المهارات</h3>
                <div className="flex flex-col gap-2">
                  {result.skill_breakdown.map((item) => (
                    <div
                      key={item.skill_tag}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 text-xs"
                    >
                      <span className="text-white/60">
                        {item.correct}/{item.total} ({Math.round(item.accuracy * 100)}%)
                      </span>
                      <span className="text-white font-medium">{item.skill_tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push(`/lessons/${subject}`)}
              className="mt-4 w-full rounded-xl bg-[#1E5C4A] py-3 text-center font-bold text-white text-sm"
            >
              متابعة التعلم
            </button>
          </div>
        )}

        {/* ── Question View ─────────────────────────────────────────────── */}
        {!loading && !error && !result && currentQ && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Progress counter */}
              <div className="flex items-center justify-between text-xs text-white/50 mb-3">
                <span>
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-white/80">
                  {currentQ.skill_tag}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
                <div
                  className="h-full bg-[#1E5C4A] transition-all"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question body */}
              <h2 className="text-xl font-bold text-white text-end leading-relaxed mb-6">
                {currentQ.body}
              </h2>

              {/* Options or text input */}
              {currentQ.qtype === "mcq" && currentQ.options ? (
                <div className="flex flex-col gap-3">
                  {Array.isArray(currentQ.options) ? (
                    currentQ.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(String(opt))}
                        className={[
                          "w-full rounded-2xl p-4 text-end font-semibold text-sm transition-all border",
                          selectedAnswers[currentQ.id] === String(opt)
                            ? "bg-[#1E5C4A] border-white/40 text-white"
                            : "bg-[#1A1A1A] border-white/5 text-white/80 hover:bg-white/5",
                        ].join(" ")}
                      >
                        {String(opt)}
                      </button>
                    ))
                  ) : typeof currentQ.options === "object" ? (
                    Object.entries(currentQ.options as Record<string, string>).map(([key, opt]) => (
                      <button
                        key={key}
                        onClick={() => handleSelect(key)}
                        className={[
                          "w-full rounded-2xl p-4 text-end font-semibold text-sm transition-all border",
                          selectedAnswers[currentQ.id] === key
                            ? "bg-[#1E5C4A] border-white/40 text-white"
                            : "bg-[#1A1A1A] border-white/5 text-white/80 hover:bg-white/5",
                        ].join(" ")}
                      >
                        {opt}
                      </button>
                    ))
                  ) : null}
                </div>
              ) : (
                <input
                  type="text"
                  dir="rtl"
                  value={selectedAnswers[currentQ.id] ?? ""}
                  onChange={(e) => handleSelect(e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="w-full rounded-2xl bg-[#1A1A1A] border border-white/10 p-4 text-white placeholder-white/40 text-end outline-none focus:border-[#1E5C4A]"
                />
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3 pt-6 pb-2">
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white/80 hover:bg-white/15"
                >
                  السابق
                </button>
              )}

              {isLast ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#2D8A6A] py-3 text-sm font-bold text-white hover:bg-[#3DAA82] disabled:opacity-50"
                >
                  {submitting ? "جاري الإرسال..." : "إنهاء الاختبار"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="flex-1 rounded-xl bg-[#1E5C4A] py-3 text-sm font-bold text-white hover:bg-[#2D8A6A]"
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
