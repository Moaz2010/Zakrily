"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { subjectsApi } from "@/lib/api/endpoints";
import type { PathNode } from "@/lib/api/types";
import { SubjectNav } from "@/components/SubjectNav";

export default function SubjectPathPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [path, setPath] = useState<PathNode[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    subjectsApi
      .path(slug)
      .then((data) => {
        if (!cancelled) setPath(data);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <>
      <SubjectNav />
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <h1 className="mb-6 text-2xl font-bold capitalize">{slug} — Unit 1</h1>

        {error && <p className="text-red-600">Couldn&apos;t load the learning path. Please try again.</p>}
        {!path && !error && <p className="text-slate-500">Loading…</p>}

        <ol className="space-y-3">
          {path?.map((node) => {
            const locked = node.status === "locked";
            const content = (
              <div
                className={`flex items-center justify-between rounded-xl border p-4 ${
                  locked
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-300 bg-white hover:border-slate-900"
                }`}
              >
                <span className="font-medium">{node.title}</span>
                <span className="text-sm">
                  {node.status === "completed" ? `Completed${node.score != null ? ` · ${Math.round(node.score * 100)}%` : ""}` : node.status}
                </span>
              </div>
            );
            return (
              <li key={node.lesson_id}>
                {locked ? content : <Link href={`/lessons/${node.lesson_id}`}>{content}</Link>}
              </li>
            );
          })}
        </ol>
      </main>
    </>
  );
}
