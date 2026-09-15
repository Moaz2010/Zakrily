import { StudentHeader } from "@/components/StudentHeader";
import styles from "./home.module.css";

export function HomeOverview({ week }: { week: { day: string; segments: string[] }[] }) {
  return <>
    <StudentHeader />
    <section className={styles.activity} aria-labelledby="weekly-activity-title">
      <h2 id="weekly-activity-title">نشاط الأسبوع</h2>
      <div className={styles.chart}>
        {week.map((item) => <div key={item.day} className={styles.column} aria-label={`يوم ${item.day}: ${item.segments.length} أنشطة`}>
          <div className={styles.track} aria-hidden="true">
            {item.segments.map((color, idx) => <div key={idx} className={styles.segment} style={{ backgroundColor: color }} />)}
          </div>
          <span className={styles.day}>{item.day}</span>
        </div>)}
      </div>
    </section>
    <section className={styles.reminder} dir="ltr" aria-label="تذكير الامتحان">
      <img src="/mascot-calendar.png" alt="ماما بتفكرك بموعد المراجعة" width={145} height={146} />
      <p dir="rtl">باقي ٣ أيام على<br />امتحان العلوم، يلا<br />نراجع</p>
    </section>
  </>;
}
