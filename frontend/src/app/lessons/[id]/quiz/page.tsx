"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { lessonsApi } from "@/lib/api/endpoints";
import type { QuestionPublic } from "@/lib/api/types";
import { QuizRunner } from "@/components/QuizRunner";

export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const lessonId = Number(params.id);
  const [questions, setQuestions] = useState<QuestionPublic[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    lessonsApi
      .quiz(lessonId)
      .then((data) => !cancelled && setQuestions(data.questions))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (error) return <main className="p-6 text-red-600">Couldn&apos;t load the quiz. Please try again.</main>;
  if (!questions) return <main className="p-6 text-slate-500">Loading…</main>;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Quiz</h1>
      <QuizRunner
        questions={questions}
        onSubmit={(answers) => lessonsApi.submitQuiz(lessonId, answers)}
      />
    </main>
  );
}
