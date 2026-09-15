"use client";

import { useEffect, useState } from "react";
import { practiceApi, subjectsApi } from "@/lib/api/endpoints";
import type { QuestionPublic, SubjectOut } from "@/lib/api/types";
import { SubjectNav } from "@/components/SubjectNav";
import { QuizRunner } from "@/components/QuizRunner";

export default function PracticePage() {
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [subject, setSubject] = useState("english");
  const [questions, setQuestions] = useState<QuestionPublic[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    subjectsApi.list().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setQuestions(null);
    practiceApi
      .next(subject, 5)
      .then((data) => !cancelled && setQuestions(data.questions))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [subject]);

  return (
    <>
      <SubjectNav />
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <h1 className="mb-6 text-2xl font-bold">Practice</h1>

        <div className="mb-6 flex gap-2">
          {subjects.map((s) => (
            <button
              key={s.slug}
              onClick={() => setSubject(s.slug)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                subject === s.slug ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {s.name_en}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600">Couldn&apos;t load practice questions. Please try again.</p>}
        {!questions && !error && <p className="text-slate-500">Loading…</p>}

        {questions && questions.length > 0 && (
          <QuizRunner
            key={subject}
            questions={questions}
            onSubmit={(answers) => practiceApi.submit(answers)}
          />
        )}
      </main>
    </>
  );
}
