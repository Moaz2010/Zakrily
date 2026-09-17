"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { subjectsApi, type PathNodeOut } from "@/lib/api";
import { getSubject } from "@/lib/curriculum";
import { TrainingActivities } from "@/components/TrainingActivities";
import { percentage, useLearner } from "@/lib/learner-context";
import styles from "./path.module.css";

const COLORS: Record<string, string> = { science: "#527f76", math: "#996963", english: "#597b96" };
const LABELS: Record<string, string> = { science: "علوم", math: "رياضيات", english: "إنجليزي" };
const X = [252, 112, 82, 238, 278, 128, 82, 252];

function LessonIcon({ kind }: { kind: "flag" | "current" | "completed" | "locked" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "flag" && <><path d="M9 4h12l-4 5 4 5H9z" fill="currentColor" stroke="none" /><path d="M5 21V3" strokeWidth="3" /></>}
      {kind === "current" && <><path d="M9 18H5V8a7 7 0 0 1 14 0v3l2 4h-3v5h-7" /><path d="M10 7a2 2 0 1 1 3 1.7c-1 .5-1 1-1 1.8M12 14h.01" /></>}
      {kind === "completed" && <path d="m5 12 4 4L19 6" strokeWidth="2.5" />}
      {kind === "locked" && <><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" stroke="none" /><path d="M8 10V7a4 4 0 0 1 8 0v3" strokeWidth="2.5" /></>}
    </svg>
  );
}

function Leaves({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 180 240" fill="currentColor" aria-hidden="true">
    <ellipse cx="126" cy="60" rx="17" ry="65" transform="rotate(-22 126 60)" />
    <ellipse cx="83" cy="111" rx="18" ry="72" transform="rotate(-65 83 111)" />
    <ellipse cx="82" cy="156" rx="17" ry="73" transform="rotate(66 82 156)" />
    <ellipse cx="132" cy="184" rx="17" ry="63" transform="rotate(23 132 184)" />
  </svg>;
}

export default function LearningPathPage() {
  const { subject: slug } = useParams<{ subject: string }>();
  const subject = getSubject(slug);
  const { stats } = useLearner();
  const subjectStats = stats?.subjects.find((item) => item.slug === slug);
  const [nodes, setNodes] = useState<PathNodeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<"lesson" | "practice">("lesson");
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setNodes([]);
    subjectsApi.path(slug)
      .then((data) => { if (active) setNodes([...data].sort((a, b) => a.order - b.order)); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, retry]);

  const current = nodes.find((node) => node.status === "unlocked");
  const completed = nodes.filter((node) => node.status === "completed").length;
  const progress = nodes.length ? Math.round(nodes.reduce((total, node) => total + (node.progress ?? (node.status === "completed" ? 1 : 0)), 0) / nodes.length * 100) : 0;
  const height = Math.max(540, nodes.length * 180 + 80);
  const points = nodes.map((_, i) => ({ x: X[i % X.length], y: height - 100 - i * 180 }));

  useEffect(() => {
    const container = viewport.current;
    if (!container || !nodes.length) return;
    const index = Math.max(0, nodes.findIndex((node) => node.status === "unlocked"));
    const y = height - 100 - index * 180;
    container.scrollTop = y - container.clientHeight + 130;
  }, [nodes, height, loading, mode]);

  if (!subject) return <div className="p-6 text-center"><h1>المادة غير موجودة</h1><Link href="/lessons" className="underline">العودة للمواد</Link></div>;

  return (
    <div className={styles.page} style={{ "--subject-color": COLORS[slug] } as CSSProperties}>
      <header className={styles.header}>
        <Leaves className={styles.headerLeaves} />
        <div className={styles.headingRow}>
          <h1>{LABELS[slug]}</h1>
          <Link href="/lessons" aria-label="العودة للمواد" className={styles.back}>
            {/* The reference places a left-pointing back arrow on the left. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 4-8 8 8 8" /></svg>
          </Link>
        </div>
        <div className={styles.summary}>
          <div className={styles.count}><span aria-hidden="true">📖</span><div><strong>{subject.unit_ar}</strong><small>{loading || error ? "—" : nodes.length} دروس</small><small>متوسط الدقة: {percentage(subjectStats?.accuracy)}</small></div></div>
          <div className={styles.progressWrap}>
            <span>{loading || error ? "—" : `${progress}٪`}</span>
            <div className={styles.progress} role="progressbar" aria-label="تقدم المادة" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </header>

      <section className={styles.unit} aria-label="معلومات الوحدة">
        <div className={styles.unitRow}>
          <div><h2>{subject.unit_ar}</h2><p>{current ? `الدرس ${current.order}` : loading ? "جاري التحميل…" : completed === nodes.length && nodes.length ? "أكملت كل الدروس" : "مسار التعلم"}</p></div>
          <div className={styles.tabs} role="group" aria-label="نوع النشاط">
            <button onClick={() => setMode("lesson")} aria-pressed={mode === "lesson"}><span aria-hidden="true">📖</span> شرح</button>
            <button onClick={() => setMode("practice")} aria-pressed={mode === "practice"}><span aria-hidden="true">✎</span> تدريبات</button>
          </div>
        </div>
        {subject.theme && <p className={styles.theme} dir="ltr" lang="en">{subject.theme}</p>}
        <p className={styles.unitTitle} dir="ltr" lang="en">{subject.unit}</p>
      </section>

      {loading ? <div className={styles.message} role="status">جاري تحميل الدروس…</div> : error ? (
        <div className={styles.message} role="alert"><p>تعذر تحميل الدروس. حاول مرة أخرى.</p><button onClick={() => setRetry((n) => n + 1)}>إعادة المحاولة</button></div>
      ) : !nodes.length ? <div className={styles.message}>لا توجد دروس متاحة بعد.</div> : mode === "practice" ? <TrainingActivities subject={slug} lessonId={(current ?? nodes[nodes.length - 1]).lesson_id} lessonActivity={slug === "science" || (slug === "english" && (current ?? nodes[nodes.length - 1]).order === 1)} /> : <>
        <div ref={viewport} className={styles.viewport} tabIndex={0} role="region" aria-label="مسار الدروس — مرر لأعلى لعرض الدروس التالية">
          <div className={styles.map} style={{ height }}>
            <Leaves className={styles.leavesRight} /><Leaves className={styles.leavesLeft} />
            <svg className={styles.trail} viewBox={`0 0 360 ${height}`} preserveAspectRatio="none" aria-hidden="true">
              <path d={`M ${points[0].x - 20} ${height + 20} Q ${points[0].x + 35} ${height - 25} ${points[0].x} ${points[0].y}`} />
              {points.slice(1).map((point, i) => {
                const previous = points[i];
                const middle = (previous.y + point.y) / 2;
                return <path key={i} d={`M ${previous.x} ${previous.y} C ${previous.x} ${middle}, ${point.x} ${middle}, ${point.x} ${point.y}`} />;
              })}
            </svg>
            <ol className={styles.lessonList}>
              {nodes.map((node, i) => {
                const point = points[i];
                const isCurrent = node.lesson_id === current?.lesson_id;
                const locked = node.status === "locked";
                const kind = locked ? "locked" : i === 0 ? "flag" : isCurrent ? "current" : "completed";
                const info = subject.lessons.find((lesson) => lesson.order === node.order);
                const status = locked ? "أكمل الدرس السابق لفتحه" : isCurrent ? "ابدأ هنا" : "مكتمل";
                const href = `/lessons/${slug}/${node.lesson_id}`;
                const content = <><span className={`${styles.node} ${styles[kind]}`}><LessonIcon kind={kind} /></span><span className={styles.label}><span className={styles.lessonNumber}>الدرس {node.order} {node.status === "completed" && "✓"}</span><strong dir="ltr" lang="en">{node.title}</strong>{info?.concept && <small dir="ltr" lang="en">{info.concept}</small>}<span className={styles.status}>{status}</span><small>أفضل نتيجة: {percentage(node.score)}</small></span></>;
                return <li key={node.lesson_id} className={`${styles.lesson} ${point.x > 180 ? styles.onRight : styles.onLeft}`} style={{ top: point.y, "--node-x": `${point.x / 360 * 100}%` } as CSSProperties}>
                  {locked ? <div className={styles.lessonContent} aria-disabled="true">{content}</div> : <Link href={href} className={styles.lessonContent} aria-current={isCurrent ? "step" : undefined} aria-label={`الدرس ${node.order}: ${node.title} — ${mode === "lesson" ? "شرح" : "تدريبات"}`}>{content}</Link>}
                </li>;
              })}
            </ol>
          </div>
        </div>
        <p className={styles.hint}>↑ مرر لأعلى لاكتشاف باقي الدروس · {completed} من {nodes.length} مكتمل</p>
      </>}
    </div>
  );
}
