"use client";

import { useEffect, useRef, useState } from "react";
import { skillsApi, type SkillScoreOut } from "@/lib/api";
import styles from "./profile.module.css";

// Existing prototype subject statistics; learner analytics are a separate API task.
const SUBJECT_PERFORMANCE = [
  { label: "الرياضيات", pct: 87, grade: "ممتاز", color: "#527f76", track: "#c8ded8" },
  { label: "علوم", pct: 55, grade: "محتاج مراجعة", color: "#c5a23b", track: "#f1e4b6" },
  { label: "انجليزي", pct: 23, grade: "سيء", color: "#d55959", track: "#f0c7c7" },
];

export default function ProfilePage() {
  const [skills, setSkills] = useState<SkillScoreOut[] | null>(null);
  const settings = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    skillsApi.mySkills().then((data) => { if (active) setSkills(data); }).catch(() => { if (active) setSkills([]); });
    return () => { active = false; };
  }, []);

  const accuracy = skills?.length ? Math.round(skills.reduce((sum, skill) => sum + skill.accuracy * 100, 0) / skills.length) : null;

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.petals} aria-hidden="true"><img src="/petals-cross.png" alt="" /><img src="/petals-diagonal.png" alt="" /></div>
      <button type="button" className={styles.settings} aria-label="إعدادات الحساب" onClick={() => settings.current?.showModal()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m10 2-.7 3-2 .9L4.5 4.5l-2 3 2.1 2.1-.2 2.4L2 14l1.5 3.2 3-.4 1.8 1.5.5 3.2h3.7l1-3 2.2-.7 2.5 1.5 2.3-2.8-1.8-2.5.3-2.2 2.5-1.6-1.2-3.4-3.2.2-1.8-1.7L14 2z" /><circle cx="12" cy="12" r="3.2" /></svg>
      </button>
      <img className={styles.person} src="/profile-person.svg" width={102} height={269} alt="شخصية الملف الشخصي" />
      <div className={styles.identity}><h1>سلمى مدحت</h1><p>رابعة ابتدائي</p></div>
    </header>
    <section className={styles.content} aria-label="إحصائيات الدراسة">
      <div className={styles.stats} dir="ltr">
        <div className={styles.accuracy} dir="rtl"><h2>متوسط الدقة</h2><strong>{accuracy === null ? "—" : `${accuracy}%`}</strong></div>
        <div className={styles.streak} aria-label="سلسلة الدراسة: 20 يومًا"><span className={styles.flame} aria-hidden="true">🔥</span><strong>20</strong><div className={styles.mom}><img src="/mom-timer.png" alt="ماما بتشجعك تستمر" width={112} height={119} /></div><span className={styles.star} aria-hidden="true">★</span></div>
      </div>
      <h2 className={styles.performanceTitle}>الأداء حسب المادة</h2>
      <div className={styles.performance}>
        {SUBJECT_PERFORMANCE.map((subject) => <div key={subject.label} className={styles.subject}>
          <div className={styles.ring} role="img" aria-label={`دقة ${subject.label}: ${subject.pct}٪`}>
            <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="22" fill="none" stroke={subject.track} strokeWidth="4.5" /><circle cx="27" cy="27" r="22" fill="none" stroke={subject.color} strokeWidth="4.5" strokeDasharray={`${subject.pct / 100 * 2 * Math.PI * 22} ${2 * Math.PI * 22}`} strokeLinecap="round" transform="rotate(-90 27 27)" /></svg>
            <span style={{ color: subject.color }}>{subject.pct}%</span>
          </div>
          <h3>{subject.label}</h3><span className={styles.grade} style={{ color: subject.color }}>{subject.grade}</span>
        </div>)}
      </div>
    </section>
    <dialog ref={settings} className={styles.dialog} aria-labelledby="settings-title"><div className={styles.dialogHeader}><h2 id="settings-title">إعدادات الحساب</h2><button onClick={() => settings.current?.close()} aria-label="إغلاق الإعدادات">×</button></div><dl><dt>الاسم</dt><dd>سلمى مدحت</dd><dt>الصف الدراسي</dt><dd>رابعة ابتدائي</dd></dl><p>تعديل بيانات الحساب سيكون متاحًا قريبًا.</p></dialog>
  </div>;
}
