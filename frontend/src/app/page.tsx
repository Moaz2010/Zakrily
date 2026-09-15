"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

export default function HomePage() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">ذاكريلي — Zakrily</h1>
      <p className="max-w-md text-slate-600">
        Unit 1 for Junior 4 — English, Math, and Science, with quizzes that learn where you&apos;re strong and where
        you need practice.
      </p>
      <div className="flex gap-3">
        {hasToken ? (
          <Link
            href="/subjects/english"
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-700"
          >
            Continue learning
          </Link>
        ) : (
          <Link href="/login" className="rounded-lg bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-700">
            Get started
          </Link>
        )}
      </div>
    </main>
  );
}
