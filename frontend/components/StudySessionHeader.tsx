import Link from "next/link";
import { getSubject } from "@/lib/curriculum";
import styles from "./StudySession.module.css";

export function StudySessionHeader({ subject, lessonId, practice = false }: { subject: string; lessonId: number; practice?: boolean }) {
  const curriculum = getSubject(subject);
  const lesson = curriculum?.lessons.find((item) => item.id === lessonId);
  return <>
    <header className={styles.header}>
      <div className={styles.petals} aria-hidden="true"><img src="/petals-cross.png" alt="" /><img src="/petals-diagonal.png" alt="" /></div>
      <div className={styles.headingRow}><span className={styles.eyebrow}>{curriculum?.name_ar ?? subject}</span><Link className={styles.back} href={`/lessons/${subject}/${lessonId}`} aria-label="العودة للدرس"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 4-8 8 8 8" /></svg></Link></div>
      <h1>{practice ? "تدريب ذكي" : "اختبر فهمك"}</h1>
      <p>{practice ? "خطوة بخطوة، هتقوّي مهاراتك" : "خد وقتك، وفكّر في كل إجابة"}</p>
    </header>
    <div className={styles.lessonInfo}><span>{curriculum?.unit_ar}{lesson && ` · الدرس ${lesson.order}`}</span><h2 dir="auto">{lesson?.title ?? "مراجعة الدرس"}</h2></div>
  </>;
}
