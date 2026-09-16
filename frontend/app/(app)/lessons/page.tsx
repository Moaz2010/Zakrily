"use client";
/**
 * /lessons — subject selection grid.
 * Taps a subject → goes to learning path /lessons/[subject].
 */
import Link from "next/link";
import { getSubject } from "@/lib/curriculum";
import { percentage, StatsStatus, useLearner } from "@/lib/learner-context";
import { CardDoodle } from "@/components/CardDoodle";
import styles from "./lessons.module.css";

export default function LessonsIndexPage() {
  const { stats } = useLearner();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.petals} aria-hidden="true"><img src="/petals-cross.png" alt="" /><img src="/petals-diagonal.png" alt="" /></div>
        <span className={styles.eyebrow}>خطوة جديدة كل يوم</span>
        <h1>دروسك</h1>
        <p>اختار مادتك، ويلا نكمّل سوا</p>
      </header>
      <div className={styles.content}>
        <div className={styles.overview}>
          <span>متوسط الدقة الكلي</span>
          <strong dir="ltr">{percentage(stats?.accuracy)}</strong>
        </div>
        <StatsStatus />
        <div className={styles.subjects}>
        {stats?.subjects.map((subject) => {
          const progress = subject.total_lessons ? Math.round(subject.lessons.reduce((total, node) => total + (node.progress ?? (node.status === "completed" ? 1 : 0)), 0) / subject.total_lessons * 100) : 0;
          return (
          <Link key={subject.id} href={`/lessons/${subject.slug}`} className={`${styles.card} ${styles[subject.slug]}`} aria-label={`دروس ${subject.name_ar}`}>
            <CardDoodle className={styles.doodle} />
            <div className={styles.cardHeading}>
              <span className={styles.subjectName} lang="en">{subject.name_en}</span>
              <h2>{subject.name_ar}</h2>
              <p className={styles.unit} dir="ltr" lang="en">{getSubject(subject.slug)?.unit}</p>
            </div>
            <div className={styles.cardFooter}>
              <div className={styles.cardStats}>
                <span>{subject.completed_lessons} من {subject.total_lessons} دروس مكتملة</span>
                <div className={styles.progress} role="progressbar" aria-label={`تقدم ${subject.name_ar}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
                <span className={styles.accuracy}>متوسط الدقة <strong dir="ltr">{percentage(subject.accuracy)}</strong></span>
              </div>
              <span className={styles.arrow} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 6 6 6-6 6" /></svg></span>
            </div>
          </Link>
        ); })}
        </div>
      </div>
    </div>
  );
}
