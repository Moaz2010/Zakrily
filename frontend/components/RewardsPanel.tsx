"use client";

import { useLearner } from "@/lib/learner-context";
import styles from "./RewardsPanel.module.css";

export function RewardsPanel({ compact = false }: { compact?: boolean }) {
  const { user, rewards, rewardsError, refreshRewards } = useLearner();

  return <section className={styles.panel} dir="rtl" aria-label="نقاطي ومكافآتي">
    <div className={styles.heading}><h2>نقاطي ومكافآتي ✨</h2></div>
    {rewardsError && <p role="alert">تعذر تحديث النقاط. <button onClick={() => void refreshRewards()}>حاول مرة أخرى</button></p>}
    {!rewards ? <p role="status">جاري تحميل نقاطك…</p> : <>
      <div className={styles.totals}>
        <div><strong>{rewards.points.toLocaleString("ar-EG")}</strong><span>نقطة</span></div>
        <div><strong>🏅 {rewards.badges.toLocaleString("ar-EG")}</strong><span>شارة مكتسبة</span></div>
      </div>
      <div className={styles.progressLabel}><span>الشارة القادمة</span><b>{rewards.points % 300} / 300</b></div>
      <progress value={rewards.points % 300} max={300} aria-label="التقدم للشارة القادمة" />
      <p className={styles.hint}>باقي {rewards.points_to_badge} نقطة لشارة جديدة</p>
      {!compact && <>
        <div className={styles.badges} aria-label={`${rewards.badges % 10} من 10 شارات للخصم القادم`}>
          {Array.from({ length: 10 }, (_, index) => <span key={index} data-earned={index < rewards.badges % 10} aria-hidden="true">★</span>)}
        </div>
        <p>كل ١٠ شارات = مكافأة خصم ١٠٪. باقي {rewards.badges_to_discount} شارات للخصم القادم.</p>
        {rewards.discounts > 0 && <div className={styles.discount}><strong>🎉 كسبت {rewards.discounts} مكافأة خصم ١٠٪!</strong><p>محفوظة في حسابك للاستخدام لاحقًا. الخصومات لا تُجمع في خصم واحد.</p></div>}
        <div className={styles.streak}>🔥 إجابات صحيحة متتالية: {rewards.correct_streak}<br />كل ٥ إجابات صحيحة متتالية تضيف ١٠ نقاط.</div>
        <details className={styles.rules}><summary>إزاي أكسب نقاط؟</summary><ul>
          <li>١٠ نقاط لكل بطاقة مكتملة، مرة واحدة.</li>
          <li>١٠ نقاط لكل ٥ دقائق مذاكرة والصفحة مفتوحة أمامك، في الدروس أو أثناء تشغيل المؤقت.</li>
          <li>٥ نقاط عند حل سؤال صح لأول مرة.</li>
          <li>١٠ نقاط إضافية لكل ٥ أسئلة جديدة تحلها صح على التوالي. الإجابة الخاطئة تبدأ السلسلة من جديد.</li>
          <li>شارة كل ٣٠٠ نقطة. نقاطك وشاراتك تفضل محفوظة.</li>
        </ul></details>
      </>}
    </>}
  </section>;
}
