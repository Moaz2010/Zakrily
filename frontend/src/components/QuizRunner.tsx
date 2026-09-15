"use client";

import { useState } from "react";
import type { QuestionPublic, QuizSubmitResponse } from "@/lib/api/types";

type Props = {
  questions: QuestionPublic[];
  onSubmit: (answers: { question_id: number; answer: string }[]) => Promise<{
    score?: number;
    results: QuizSubmitResponse["results"];
    skill_breakdown: QuizSubmitResponse["skill_breakdown"];
  }>;
};

export function QuizRunner({ questions, onSubmit }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<Awaited<ReturnType<Props["onSubmit"]>> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  function setAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  async function handleNext() {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    setError(false);
    try {
      const payload = questions.map((q) => ({ question_id: q.id, answer: answers[q.id] ?? "" }));
      const res = await onSubmit(payload);
      setResult(res);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        {result.score != null && (
          <p className="text-lg font-semibold">Score: {Math.round(result.score * 100)}%</p>
        )}
        <div>
          <h3 className="mb-2 font-semibold">Strengths & weaknesses</h3>
          <ul className="space-y-1">
            {result.skill_breakdown.map((item) => (
              <li key={item.skill_tag} className="flex justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm">
                <span className="capitalize">{item.skill_tag}</span>
                <span>
                  {item.insufficient_data
                    ? "Not enough data yet"
                    : `${item.correct}/${item.total} (${Math.round((item.accuracy ?? 0) * 100)}%)`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Question {index + 1} of {questions.length}
      </p>
      <p className="text-lg font-medium">{current.body}</p>

      {current.qtype === "mcq" && current.options ? (
        <div className="space-y-2">
          {Object.entries(current.options as Record<string, string>).map(([key, label]) => (
            <label
              key={key}
              className={`block cursor-pointer rounded-lg border px-4 py-2 ${
                answers[current.id] === key ? "border-slate-900 bg-slate-50" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name={`q-${current.id}`}
                className="mr-2"
                checked={answers[current.id] === key}
                onChange={() => setAnswer(key)}
              />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={answers[current.id] ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer"
        />
      )}

      {error && <p className="text-sm text-red-600">Couldn&apos;t submit. Please try again.</p>}

      <button
        onClick={handleNext}
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : isLast ? "Submit" : "Next"}
      </button>
    </div>
  );
}
