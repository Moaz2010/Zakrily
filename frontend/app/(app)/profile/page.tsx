"use client";

import { useRef } from "react";
import { percentage, StatsStatus, useLearner } from "@/lib/learner-context";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { user, stats, signOut } = useLearner();
  const settings = useRef<HTMLDialogElement>(null);
  const subjects = stats?.subjects.map((subject) => ({
    label: subject.name_ar, pct: subject.accuracy == null ? null : Math.round(subject.accuracy * 100),
    grade: subject.accuracy == null ? "لا توجد نتائج بعد" : subject.accuracy >= .8 ? "ممتاز" : subject.accuracy >= .6 ? "جيد" : "محتاج مراجعة",
    color: subject.accuracy == null ? "#6e7a7d" : subject.accuracy >= .8 ? "#527f76" : subject.accuracy >= .6 ? "#c5a23b" : "#d55959",
    track: "#e1e5e1",
  })) ?? [];

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.petals} aria-hidden="true"><img src="/petals-cross.png" alt="" /><img src="/petals-diagonal.png" alt="" /></div>
      <button type="button" className={styles.settings} aria-label="إعدادات الحساب" onClick={() => settings.current?.showModal()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m10 2-.7 3-2 .9L4.5 4.5l-2 3 2.1 2.1-.2 2.4L2 14l1.5 3.2 3-.4 1.8 1.5.5 3.2h3.7l1-3 2.2-.7 2.5 1.5 2.3-2.8-1.8-2.5.3-2.2 2.5-1.6-1.2-3.4-3.2.2-1.8-1.7L14 2z" /><circle cx="12" cy="12" r="3.2" /></svg>
      </button>
      <img className={styles.person} src="/profile-person.svg" width={102} height={269} alt="شخصية الملف الشخصي" />
      <div className={styles.identity}><h1>{user.name}</h1><p dir="ltr">{user.email}</p></div>
    </header>
    <section className={styles.content} aria-label="إحصائيات الدراسة">
      <StatsStatus />
      <div className={styles.stats} dir="ltr">
        <div className={styles.accuracy} dir="rtl"><h2>متوسط الدقة</h2><strong>{percentage(stats?.accuracy)}</strong></div>
        <div className={styles.streak} aria-label={`سلسلة الدراسة: ${stats?.streak_days ?? "—"} يومًا`}><span className={styles.flame} aria-hidden="true">🔥</span><strong>{stats?.streak_days ?? "—"}</strong><div className={styles.mom}><img src="/mom-timer.png" alt="ماما بتشجعك تستمر" width={112} height={119} /></div><span className={styles.star} aria-hidden="true">★</span></div>
      </div>
      <h2 className={styles.performanceTitle}>الأداء حسب المادة</h2>
      <div className={styles.performance}>
        {subjects.map((subject) => <div key={subject.label} className={styles.subject}>
          <div className={styles.ring} role="img" aria-label={`دقة ${subject.label}: ${subject.pct == null ? "لا توجد نتائج" : `${subject.pct}%`}`}>
            <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="22" fill="none" stroke={subject.track} strokeWidth="4.5" /><circle cx="27" cy="27" r="22" fill="none" stroke={subject.color} strokeWidth="4.5" strokeDasharray={`${(subject.pct ?? 0) / 100 * 2 * Math.PI * 22} ${2 * Math.PI * 22}`} strokeLinecap="round" transform="rotate(-90 27 27)" /></svg>
            <span style={{ color: subject.color }}>{subject.pct == null ? "—" : `${subject.pct}%`}</span>
          </div>
          <h3>{subject.label}</h3><span className={styles.grade} style={{ color: subject.color }}>{subject.grade}</span>
        </div>)}
      </div>
    </section>
    <dialog ref={settings} className={styles.dialog} aria-labelledby="settings-title"><div className={styles.dialogHeader}><h2 id="settings-title">إعدادات الحساب</h2><button onClick={() => settings.current?.close()} aria-label="إغلاق الإعدادات">×</button></div><dl><dt>الاسم</dt><dd>{user.name}</dd><dt>البريد الإلكتروني</dt><dd dir="ltr">{user.email}</dd></dl><button onClick={signOut} className="mt-4 underline">تسجيل الخروج</button></dialog>
  </div>;
}
