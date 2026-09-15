"use client";

import { useEffect, useState } from "react";
import { skillsApi } from "@/lib/api/endpoints";
import type { SkillBreakdownItem, SubjectOut } from "@/lib/api/types";
import { subjectsApi } from "@/lib/api/endpoints";
import { SubjectNav } from "@/components/SubjectNav";

export default function SkillsPage() {
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [subject, setSubject] = useState("english");
  const [skills, setSkills] = useState<SkillBreakdownItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    subjectsApi.list().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSkills(null);
    skillsApi
      .mine(subject)
      .then((data) => !cancelled && setSkills(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [subject]);

  return (
    <>
      <SubjectNav />
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <h1 className="mb-6 text-2xl font-bold">My Skills</h1>

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

        {error && <p className="text-red-600">Couldn&apos;t load skills. Please try again.</p>}
        {!skills && !error && <p className="text-slate-500">Loading…</p>}

        <ul className="space-y-2">
          {skills?.map((item) => (
            <li key={item.skill_tag} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <span className="font-medium capitalize">{item.skill_tag}</span>
              {item.insufficient_data ? (
                <span className="text-sm text-slate-400">Not enough data yet</span>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-slate-900"
                      style={{ width: `${Math.round((item.accuracy ?? 0) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">{Math.round((item.accuracy ?? 0) * 100)}%</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
