"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { lessonsApi } from "@/lib/api/endpoints";
import type { LessonDetail } from "@/lib/api/types";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const lessonId = Number(params.id);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    lessonsApi
      .get(lessonId)
      .then((data) => !cancelled && setDetail(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (error) return <main className="p-6 text-red-600">Couldn&apos;t load this lesson. Please try again.</main>;
  if (!detail) return <main className="p-6 text-slate-500">Loading…</main>;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="mb-2 text-2xl font-bold">{detail.lesson.title}</h1>
      <p className="mb-6 text-slate-600">{detail.lesson.objective}</p>

      <div className="space-y-6">
        {detail.sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-1 text-lg font-semibold">{section.heading}</h2>
            <p className="whitespace-pre-wrap text-slate-700">{section.body_md}</p>
          </section>
        ))}
      </div>

      <Link
        href={`/lessons/${lessonId}/quiz`}
        className="mt-8 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-700"
      >
        Start quiz
      </Link>
    </main>
  );
}
