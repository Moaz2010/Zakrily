"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUBJECTS = [
  { slug: "english", label: "English" },
  { slug: "math", label: "Math" },
  { slug: "science", label: "Science" },
];

export function SubjectNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-4">
      {SUBJECTS.map((s) => (
        <Link
          key={s.slug}
          href={`/subjects/${s.slug}`}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            pathname?.includes(`/subjects/${s.slug}`)
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {s.label}
        </Link>
      ))}
      <div className="ml-auto flex gap-2">
        <Link href="/skills" className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          My Skills
        </Link>
        <Link href="/practice" className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Practice
        </Link>
      </div>
    </nav>
  );
}
