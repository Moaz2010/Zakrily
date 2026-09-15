import Link from "next/link";
import styles from "./StudySession.module.css";

export function SessionEmpty({ subject, lessonId }: { subject: string; lessonId: number }) {
  return <div className={styles.empty}><h2>الأسئلة في الطريق</h2><p>لا توجد أسئلة متاحة لهذا الدرس بعد. تقدر ترجع للشرح وتراجع اللي اتعلمته.</p><Link className={styles.primary} href={`/lessons/${subject}/${lessonId}`}>العودة للدرس</Link></div>;
}
