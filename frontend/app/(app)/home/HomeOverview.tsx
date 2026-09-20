import { StudentHeader } from "@/components/StudentHeader";
import { RewardsPanel } from "@/components/RewardsPanel";
import { useLearner } from "@/lib/learner-context";
import styles from "./home.module.css";

const COLORS: Record<string, string> = { math: "#B05B54", english: "#597b96", science: "#4A7C6D" };

export function HomeOverview() {
  const { stats } = useLearner();
  const max = Math.max(1, ...(stats?.week.map((day) => day.total) ?? []));
  return <>
    <StudentHeader />
    <RewardsPanel compact />
    <section className={styles.activity} aria-labelledby="weekly-activity-title">
      <h2 id="weekly-activity-title">نشاط الأسبوع</h2>
      <p className="text-xs mb-3">عدد الإجابات في آخر ٧ أيام</p>
      <div className={styles.chart}>
        {stats?.week.map((item) => <div key={item.date} className={styles.column} aria-label={`${item.date}: ${item.total} إجابات`}>
          <div className={styles.track} aria-hidden="true">
            {item.subjects.filter((subject) => subject.count > 0).map((subject) => {
              const slug = stats.subjects.find((s) => s.id === subject.subject_id)?.slug ?? "";
              return <div key={subject.subject_id} className={styles.segment} style={{ backgroundColor: COLORS[slug], height: `${subject.count / max * 100}%` }} />;
            })}
          </div>
          <span className={styles.day}>{item.date.slice(5).replace("-", "/")}</span>
          <span className="text-xs">{item.total}</span>
        </div>)}
      </div>
      {stats && <div className="flex flex-wrap gap-3 mt-3 text-xs">{stats.subjects.map((subject) => <span key={subject.id}><span style={{ color: COLORS[subject.slug] }}>●</span> {subject.name_ar}</span>)}</div>}
      {stats?.total_attempts === 0 && <p className="text-sm mt-3">ابدأ اختبار أو تدريب عشان يظهر نشاطك هنا.</p>}
    </section>
    <section className={styles.reminder} dir="ltr" aria-label="تشجيع للمذاكرة">
      <img src="/mascot-calendar.png" alt="ماما بتشجعك تذاكر" width={145} height={146} />
      <p dir="rtl">{stats && stats.streak_days > 0 ? `برافو! مستمر ${stats.streak_days} أيام، كمّل تقدمك` : "يلا نبدأ خطوة جديدة في المذاكرة"}</p>
    </section>
  </>;
}
