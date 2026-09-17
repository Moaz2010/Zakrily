"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { lessonsApi } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import styles from "./ScienceLearn.module.css";

const TOTAL_CARDS = 18;

const DIGIT_2_STAGES = [
  { place: "Millions", placeAr: "الملايين", digit: "2", value: "2,000,000", zeros: 6, times: "1,000,000" },
  { place: "Hundred Thousands", placeAr: "مئات الآلاف", digit: "2", value: "200,000", zeros: 5, times: "100,000" },
  { place: "Ten Thousands", placeAr: "عشرات الآلاف", digit: "2", value: "20,000", zeros: 4, times: "10,000" },
  { place: "Thousands", placeAr: "الآلاف", digit: "2", value: "2,000", zeros: 3, times: "1,000" },
  { place: "Hundreds", placeAr: "المئات", digit: "2", value: "200", zeros: 2, times: "100" },
  { place: "Tens", placeAr: "العشرات", digit: "2", value: "20", zeros: 1, times: "10" },
  { place: "Ones", placeAr: "الآحاد", digit: "2", value: "2", zeros: 0, times: "1" },
];

function MiniQuiz({
  eyebrow, question, options, correct, success, retry, columns = 3,
}: {
  eyebrow: string; question: string; options: [string, string][];
  correct: string; success: string; retry: string; columns?: 2 | 3;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  return (
    <div className={styles.challenge} dir="rtl">
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h4 dir="ltr" style={{ textAlign: "left" }}>{question}</h4>
      <div className={`${styles.choices} ${columns === 2 ? styles.choices2 : ""}`}>
        {options.map(([icon, name]) => (
          <button key={name} type="button" aria-pressed={choice === name} onClick={() => setChoice(name)}>
            <span aria-hidden="true">{icon}</span>
            {name}
          </button>
        ))}
      </div>
      {choice && (
        <p className={styles.feedback} role="status">
          {choice === correct ? success : retry}
        </p>
      )}
    </div>
  );
}

function Digit2ShiftExplorer() {
  const [picked, setPicked] = useState(4); // Default to Hundreds
  const item = DIGIT_2_STAGES[picked];
  return (
    <div>
      <p className={styles.helper} dir="rtl">اضغط على أي خانة عشان تشوف كيف قيمة الرقم 2 بتكبر كل ما يتحرك لليسار:</p>
      <div className={styles.periodDigits} dir="ltr" style={{ margin: "8px 0 12px", overflowX: "auto", paddingBottom: "4px" }}>
        {DIGIT_2_STAGES.map((cell, index) => (
          <button
            key={cell.place}
            type="button"
            className={styles.digitKey}
            aria-pressed={picked === index}
            aria-label={`${cell.digit} in the ${cell.place} place`}
            onClick={() => setPicked(index)}
            style={{ minWidth: "44px" }}
          >
            {cell.digit}
          </button>
        ))}
      </div>
      <article className={styles.conceptCard} dir="ltr">
        <span className={styles.bigEmoji} aria-hidden="true">📈</span>
        <h4>Digit {item.digit} in {item.place}</h4>
        <p>Place: <strong>{item.place}</strong> (<span dir="rtl">{item.placeAr}</span>)</p>
        <p>Value: <strong>{item.value}</strong> ({item.zeros} zeros)</p>
        <span className={styles.pill} dir="rtl">
          {picked < 6 ? `← أكبر من خانة ${DIGIT_2_STAGES[picked + 1].placeAr} بـ 10 أضعاف (×10)` : "خانة البداية (الآحاد)"}
        </span>
      </article>
    </div>
  );
}

function CardShell({ icon, badge, title, hint, children }: {
  icon: string; badge: string; title: string; hint?: string; children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <div className={styles.duoCard}>
      <div className={styles.mascotRow}>
        <span className={styles.duoHeroIcon} aria-hidden="true">{icon}</span>
        <div className={styles.mascotBubble}>
          <span className={styles.cardBadge}>{badge}</span>
          <h3 ref={headingRef} tabIndex={-1}>{title}</h3>
          {hint && <small className={styles.englishHint} dir="rtl">{hint}</small>}
        </div>
      </div>
      <div className={styles.cardContentBody}>{children}</div>
    </div>
  );
}

export function MathLearn2({
  lessonId,
  onCompletePractice,
  onProgress,
}: {
  lessonId: number;
  onCompletePractice?: () => void;
  onProgress?: () => void;
}) {
  const [step, setStep] = useState(0);
  const { refresh } = useLearner();
  const [learned, setLearned] = useState<number[]>([]);
  const [saveError, setSaveError] = useState("");

  async function restore() {
    setSaveError("");
    let localLearned: number[] = [];
    try {
      const raw = localStorage.getItem(`zakrely_learned_${lessonId}`);
      if (raw) localLearned = JSON.parse(raw);
    } catch {}
    if (localLearned.length > 0) {
      setLearned(localLearned);
      const nextStep = localLearned.length;
      setStep(nextStep < TOTAL_CARDS ? nextStep : 0);
    }
    try {
      const saved = await lessonsApi.activity(lessonId);
      if (saved && Array.isArray(saved.learned_steps)) {
        const merged = [...new Set([...localLearned, ...saved.learned_steps])];
        setLearned(merged);
        if (localLearned.some((value) => !saved.learned_steps.includes(value))) {
          await lessonsApi.saveActivity(lessonId, { learned_steps: merged, learning_total: TOTAL_CARDS });
          onProgress?.();
          void refresh();
        }
        if (localLearned.length === 0) {
          const nextStep = merged.length;
          setStep(nextStep < TOTAL_CARDS ? nextStep : 0);
        }
      }
    } catch {}
  }

  useEffect(() => {
    void restore();
  }, [lessonId]);

  function go(next: number) {
    setStep(next);
  }

  function advance() {
    const newLearned = [...new Set([...learned, step])];
    setLearned(newLearned);
    try {
      localStorage.setItem(`zakrely_learned_${lessonId}`, JSON.stringify(newLearned));
    } catch {}
    if (step < TOTAL_CARDS - 1) go(step + 1);
    else setStep(TOTAL_CARDS);
    lessonsApi.saveActivity(lessonId, { learned_steps: newLearned, learning_total: TOTAL_CARDS })
      .then(() => { setSaveError(""); onProgress?.(); void refresh(); })
      .catch(() => setSaveError("تم الحفظ على هذا الجهاز. سنحاول مزامنة تقدمك عند فتح الدرس مرة أخرى."));
  }

  const current = step >= TOTAL_CARDS ? TOTAL_CARDS : step + 1;

  return (
    <div className={`${styles.learnContainer} ${styles.mathLearn}`} dir="ltr" lang="en" aria-label="Explore Math Lesson 2">
      <header className={styles.duoHeader}>
        <div className={styles.headerLeft} dir="rtl">
          <span className={styles.duoBadge}>🌟 نقاط +{learned.length * 10}</span>
          <span className={styles.stepCount}>بطاقة {current} من {TOTAL_CARDS}</span>
        </div>
        <div className={styles.duoProgress} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={TOTAL_CARDS}>
          <div className={styles.duoProgressBar} style={{ width: `${(current / TOTAL_CARDS) * 100}%` }} />
        </div>
      </header>

      <main className={styles.duoViewport}>
        {step === 0 && (
          <CardShell icon="🔟" badge="أهلاً يا بطل! 🚀 LESSON 2" title="Changing Values!" hint="القيمة المتغيرة للرقم">
            <p dir="rtl" className="text-sm font-bold text-[#292c32]">
              في الدرس الأول عرفنا أسماء الخانات والفترات. النهاردة هنكتشف سر سحري: إيه اللي بيحصل لقيمة الرقم لما يتحرك خطوة واحدة أو أكتر للشمال؟
            </p>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">💡</span>
              <div>
                <strong>القاعدة السرية:</strong>
                <p>كل ما الرقم يتحرك خانة لليسار، قيمته بتزيد 10 أضعاف وبيزيد صفر!</p>
              </div>
            </div>
          </CardShell>
        )}

        {step === 1 && (
          <CardShell icon="🎯" badge="أهداف الدرس | OBJECTIVES" title="What You Will Learn" hint="أهداف درس النهاردة">
            <div className={styles.stack}>
              {[
                ["⬅️", "Explain how value changes moving left", "ازاي قيمة الرقم بتتغير لما يتحرك لليسار"],
                ["0️⃣", "Describe the pattern of zeros", "اكتشاف نمط زيادة الأصفار في الأعداد"],
                ["🔄", "Rename numbers using units", "إعادة تسمية الأعداد (عشرات، مئات، آلاف)"],
              ].map(([icon, en, ar]) => (
                <article key={en} className={styles.factRow}>
                  <span className="text-2xl" aria-hidden="true">{icon}</span>
                  <div>
                    <strong>{en}</strong>
                    <small className={styles.englishHint} dir="rtl">{ar}</small>
                  </div>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 2 && (
          <CardShell icon="🔟" badge="نظام العشرات | BASE-TEN" title="Our Base-Ten System" hint="نظام العد العشري">
            <article className={styles.conceptCard}>
              <span className={styles.bigEmoji} aria-hidden="true">🧮</span>
              <h4 dir="rtl">نظامنا الحسابي مبني على الرقم 10 (Base-Ten System).</h4>
              <p dir="rtl">يعني كل خانة هي بالظبط <strong>10 أضعاف</strong> الخانة اللي على يمينها مباشرة.</p>
              <span className={styles.pill}>10 Ones = 1 Ten · 10 Tens = 1 Hundred · 10 Hundreds = 1 Thousand</span>
            </article>
            <p className={styles.helper} dir="rtl">10 جنيهات بتعمل ورقة بعشرة، و10 ورقات بعشرة بيعملوا مية! دي فكرة نظام العشرات.</p>
          </CardShell>
        )}

        {step === 3 && (
          <CardShell icon="📈" badge="جدول الرقم 2 | THE DIGIT 2" title="Watch 2 Grow!" hint="قيمة الرقم 2 في 7 خانات مختلفة">
            <Digit2ShiftExplorer />
          </CardShell>
        )}

        {step === 4 && (
          <CardShell icon="⬅️" badge="القاعدة الذهبية | THE 10× RULE" title="One Place to the Left" hint="خطوة واحدة لليسار">
            <article className={styles.conceptCard}>
              <h4 dir="ltr">One step left = 10 times greater</h4>
              <p dir="rtl">لما الرقم يتحرك خانة واحدة لليسار، بنضربه في 10 وبنزود صفر واحد على اليمين.</p>
              <span className={styles.pill}>2 → 20 → 200 → 2,000 → 20,000</span>
            </article>
            <MiniQuiz
              eyebrow="سؤال من كتاب الوزارة"
              question="If a digit moves one space to the left on the place value chart, its value equals ______ times."
              options={[["1️⃣", "1"], ["🔟", "10"], ["💯", "100"]]}
              correct="10"
              success="✨ ممتاز! كل خانة لليسار = 10 أضعاف الخانة اللي على يمينها."
              retry="🔍 نفتكر: نظامنا عشري، خطوة واحدة لليسار = ×10."
            />
          </CardShell>
        )}

        {step === 5 && (
          <CardShell icon="📏" badge="خطوتان لليسار | TWO PLACES" title="Two Places Left = ×100" hint="خانتين لليسار = 100 ضعف">
            <article className={styles.conceptCard} dir="rtl">
              <h4>لو اتحرك خانتين لليسار:</h4>
              <p>بنضرب في 10 مرتين: <strong>10 × 10 = 100 ضعف</strong> (بنزود صفرين).</p>
              <p dir="ltr">Tens (70) → Hundreds (700) → Thousands (7,000)</p>
              <span className={styles.pill} dir="ltr">7,000 ÷ 70 = 100 times</span>
            </article>
            <MiniQuiz
              eyebrow="قارن بين الخانات"
              question="The value of 7 in the Thousands place is ______ times the value of 7 in the Tens place."
              options={[["🔟", "10"], ["💯", "100"], ["1️⃣0️⃣0️⃣0️⃣", "1,000"]]}
              correct="100"
              success="✨ بطل! من Tens إلى Thousands خانتين: 10 × 10 = 100 ضعف."
              retry="🔍 عد الخانات: Tens → Hundreds → Thousands = خطوتين (صفرين) = 100."
            />
          </CardShell>
        )}

        {step === 6 && (
          <CardShell icon="🔍" badge="مثال الكتاب | 34,042" title="Compare Two 4s" hint="المقارنة بين رقمين في عدد واحد">
            <div className={styles.periodStrip} dir="ltr">
              <article className={styles.periodBox}>
                <small>THOUSANDS</small>
                <div className={styles.periodDigits}><span>3</span><span style={{ color: "#d97706", fontWeight: "bold" }}>4</span></div>
                <span className={styles.pill}>Thousands = 4,000</span>
              </article>
              <article className={styles.periodBox}>
                <small>ONES</small>
                <div className={styles.periodDigits}><span>0</span><span style={{ color: "#d97706", fontWeight: "bold" }}>4</span><span>2</span></div>
                <span className={styles.pill}>Tens = 40</span>
              </article>
            </div>
            <MiniQuiz
              eyebrow="تمرين المعاصر"
              question="In 34,042, the digit 4 in Thousands is ______ times the digit 4 in Tens."
              options={[["A", "10"], ["B", "100"], ["C", "1,000"]]}
              correct="100"
              success="✨ صح! 4 في الآلاف (4,000) و 4 في العشرات (40). 4,000 ÷ 40 = 100."
              retry="🔍 اكتب قيم كل رقم: 4,000 و 40، ثم اقسم 4,000 على 40."
            />
          </CardShell>
        )}

        {step === 7 && (
          <CardShell icon="📐" badge="ثلاث خطوات | THREE PLACES" title="Three Places Left = ×1,000" hint="3 خانات = 1,000 ضعف">
            <div className={styles.stack}>
              {[
                ["1 step left", "× 10", "صفر واحد (10)"],
                ["2 steps left", "× 100", "صفرين (100)"],
                ["3 steps left", "× 1,000", "3 أصفار (1,000)"],
              ].map(([stepName, mult, ar]) => (
                <article key={stepName} className={styles.factRow} dir="ltr">
                  <span className="text-xl" aria-hidden="true">⚡</span>
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{stepName} = {mult}</strong>
                    <small className={styles.englishHint} dir="rtl">{ar}</small>
                  </div>
                </article>
              ))}
            </div>
            <MiniQuiz
              eyebrow="احسب التضاعف"
              question="How many times does the value increase when a digit moves 3 places to the left?"
              options={[["3️⃣0️⃣", "30"], ["💯", "100"], ["1️⃣0️⃣0️⃣0️⃣", "1,000"]]}
              correct="1,000"
              success="✨ رائع! 10 × 10 × 10 = 1,000 ضعف (3 أصفار جديدة)."
              retry="🔍 مش بنضرب في 3! بنضرب في 10 تلات مرات: 10 × 10 × 10 = 1,000."
            />
          </CardShell>
        )}

        {step === 8 && (
          <CardShell icon="0️⃣" badge="نمط الأصفار | PATTERN OF ZEROS" title="Count the Zeros!" hint="كل خانة لليسار بتضيف صفر">
            <article className={styles.conceptCard} dir="rtl">
              <h4>لاحظ النمط الجميل:</h4>
              <p className="text-sm font-semibold leading-6">
                Ones (2) ← صفر أصفار<br/>
                Tens (20) ← صفر واحد<br/>
                Hundreds (200) ← صفرين<br/>
                Thousands (2,000) ← 3 أصفار<br/>
                Ten Thousands (20,000) ← 4 أصفار
              </p>
              <span className={styles.pill} dir="ltr">Moving Left = +1 Zero each step</span>
            </article>
          </CardShell>
        )}

        {step === 9 && (
          <CardShell icon="🔄" badge="إعادة التسمية | RENAMING" title="Renaming Numbers" hint="نفس العدد بس بوحدات مختلفة">
            <article className={styles.conceptCard} dir="rtl">
              <h4>يعني إيه Renaming؟</h4>
              <p className="text-sm font-semibold leading-6">
                العدد نفسه ممكن نقراه بكذا طريقة زي الفلوس بالظبط:<br/>
                500 جنيه = 50 ورقة من فئة 10 جنيهات (50 tens).<br/>
                56,000 = 56 ألف (56 thousands).
              </p>
              <span className={styles.pill} dir="ltr">56,000 = 56 thousands = 560 hundreds</span>
            </article>
            <p className={styles.helper} dir="rtl">القاعدة: لو بتحول لرقم عادي بتزود أصفار الوحدة، لو بتحول لاسم الوحدة بتحذف أصفارها!</p>
          </CardShell>
        )}

        {step === 10 && (
          <CardShell icon="✖️" badge="تحويل العشرات | RENAMING TENS" title="Tens → Add 1 Zero" hint="عشرات = زود صفر أو اضرب في 10">
            <p dir="rtl" className="text-sm font-bold">كلمة tens معناها نضرب في 10 (نزود صفر على اليمين):</p>
            <article className={styles.conceptCard} dir="ltr">
              <p>30 tens = 30 × 10 = <strong>300</strong></p>
              <p>60 tens = 60 × 10 = <strong>600</strong></p>
              <span className={styles.pill} dir="rtl">30 عشرات = 300</span>
            </article>
            <MiniQuiz
              eyebrow="تطبيق مباشر"
              question="80 tens = ______"
              options={[["8️⃣0️⃣", "80"], ["8️⃣0️⃣0️⃣", "800"], ["8️⃣0️⃣0️⃣0️⃣", "8,000"]]}
              correct="800"
              success="✨ تمام! 80 × 10 = 800 (نضيف صفر العشرات)."
              retry="🔍 كلمة tens معناها اضرب في 10 أو زود صفر: 80 tens = 800."
            />
          </CardShell>
        )}

        {step === 11 && (
          <CardShell icon="✖️" badge="تحويل المئات | RENAMING HUNDREDS" title="Hundreds → 2 Zeros" hint="مئات = احذف أو زود صفرين">
            <p dir="rtl" className="text-sm font-bold">الـ hundred فيها صفرين (100). لو معاك العدد وعايز تعرف فيه كام hundred، احذف صفرين:</p>
            <article className={styles.conceptCard} dir="ltr">
              <p>23,800 = 238 hundreds</p>
              <p>300 thousands = 300,000 = 3,000 hundreds</p>
              <span className={styles.pill} dir="rtl">23,800 فيها 238 مئة</span>
            </article>
            <MiniQuiz
              eyebrow="احذف صفرين"
              question="280,000 = ______ hundreds"
              options={[["2️⃣8️⃣0️⃣", "280"], ["2️⃣8️⃣0️⃣0️⃣", "2,800"], ["2️⃣8️⃣", "28"]]}
              correct="2,800"
              success="✨ شاطر! مئات يعني نحذف صفرين: 280,000 ÷ 100 = 2,800."
              retry="🔍 الـ hundred فيها صفرين، احذف صفرين من 280,000 يتبقى 2,800."
            />
          </CardShell>
        )}

        {step === 12 && (
          <CardShell icon="📦" badge="تحويل الآلاف | THOUSANDS" title="Thousands → 3 Zeros" hint="آلاف = 3 أصفار (1,000)">
            <article className={styles.conceptCard} dir="ltr">
              <p>56,000 = 56 thousands (نحذف 3 أصفار)</p>
              <p>32,000 = 32 thousands</p>
              <span className={styles.pill} dir="rtl">56 ألف = 56,000</span>
            </article>
            <MiniQuiz
              eyebrow="من تدريبات الكتاب"
              question="56,000 = ______ thousands"
              options={[["5️⃣6️⃣", "56"], ["5️⃣6️⃣0️⃣", "560"], ["5️⃣6️⃣0️⃣0️⃣", "5,600"]]}
              correct="56"
              success="✨ بالضبط! 56,000 = 56 thousands (حذفنا 3 أصفار)."
              retry="🔍 thousand = 1,000 (3 أصفار). احذف 3 أصفار من 56,000."
            />
          </CardShell>
        )}

        {step === 13 && (
          <CardShell icon="🌍" badge="من آلاف لملايين | MILLIONS" title="1,000 Thousands = 1 Million" hint="علاقة الألف بالمليون">
            <article className={styles.conceptCard} dir="rtl">
              <h4>قاعدة ذهبية:</h4>
              <p>1,000 آلاف = 1,000,000 (مليون واحد)!</p>
              <p dir="ltr">7,000 thousands = 7,000 × 1,000 = 7,000,000 = 7 millions</p>
              <span className={styles.pill} dir="ltr">7,000 thousands = 7 millions</span>
            </article>
            <MiniQuiz
              eyebrow="تحدي المليون"
              question="7,000 thousands = ______ millions"
              options={[["7️⃣", "7"], ["7️⃣0️⃣", "70"], ["7️⃣0️⃣0️⃣", "700"]]}
              correct="7"
              success="✨ عبقري! 7,000 × 1,000 = 7,000,000 = 7 millions."
              retry="🔍 7,000 thousands هي 7,000,000.. يعني 7 ملايين."
            />
          </CardShell>
        )}

        {step === 14 && (
          <CardShell icon="⚠️" badge="أخطاء شائعة | MISTAKES" title="Watch out!" hint="3 لخبطات مشهورة لازم تاخد بالك منها">
            <div className={styles.stack}>
              {[
                "حركة خانة واحدة لليسار معناها × 10 (مش × 100).",
                "لما تشوف 30 tens افتكر إنها 30 × 10 = 300 (مش 30).",
                "خانة Hundred Thousands هي 10 أضعاف Ten Thousands لأنهم جيران.",
              ].map((text) => (
                <article key={text} className={styles.factRow} dir="rtl">
                  <span aria-hidden="true">💡</span>
                  <strong>{text}</strong>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 15 && (
          <CardShell icon="💬" badge="مفردات | VOCABULARY" title="Words to keep" hint="المفردات الأساسية للدرس">
            <div className={styles.wordGrid}>
              {[
                ["base-ten", "نظام العد العشري"],
                ["10 times", "10 أضعاف (مضروب في 10)"],
                ["moving left", "التحرك لليسار (القيمة بتكبر)"],
                ["renaming", "إعادة التسمية بالوحدات"],
                ["zeros pattern", "نمط زيادة الأصفار"],
                ["digit value", "قيمة الرقم حسب مكانه"],
              ].map(([en, ar]) => (
                <article key={en} className={styles.vocabTile}>
                  <strong dir="ltr">{en}</strong>
                  <small dir="rtl">{ar}</small>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 16 && (
          <CardShell icon="🎮" badge="امتحان الوزارة | EXAM QUESTION" title="Unit Assessment Challenge" hint="سؤال امتحان نهائي">
            <MiniQuiz
              eyebrow="سؤال تقييم الوحدة"
              question="100,000 is ______ times the number 10,000."
              options={[["🔟", "10"], ["💯", "100"], ["1️⃣0️⃣0️⃣0️⃣", "1,000"]]}
              correct="10"
              success="✨ 100,000 على يسار 10,000 مباشرة، خانة واحدة = 10 أضعاف!"
              retry="🔍 مئات الآلاف وعشرات الآلاف جيران، كل خانة 10 أضعاف اللي على يمينها."
            />
          </CardShell>
        )}

        {step === 17 && (
          <CardShell icon="⭐" badge="ملخص الدرس | SUMMARY" title="What to remember" hint="أهم خلاصة لازم تفتكرها">
            <article className={styles.conceptCard} dir="rtl">
              <h4>الخلاصة في 3 جمل:</h4>
              <p className="text-sm font-semibold leading-7">
                1. خانة لليسار = ×10 (صفر زيادة). خانتين = ×100. تلاتة = ×1,000.<br/>
                2. نظامنا عشري: كل خانة 10 أضعاف جارتها اللي على اليمين.<br/>
                3. التسمية: 60 tens = 600 ، و 56,000 = 56 thousands ، و 7,000 thousands = 7 millions.
              </p>
            </article>
            <span className={styles.pill} dir="ltr">1 step left = ×10 · 2 steps = ×100 · 3 steps = ×1,000</span>
          </CardShell>
        )}

        {step >= TOTAL_CARDS && (
          <div className={styles.duoCelebrationCard} dir="rtl">
            <span className={styles.celebrationIcon} aria-hidden="true">🌟 🏆 🔟</span>
            <h3>ماشاء الله يا بطل! أتممت شرح الدرس الثاني!</h3>
            <p>عرفت قاعدة الـ 10 أضعاف وإعادة تسمية الأعداد بامتياز. جاهز للتدريبات!</p>
          </div>
        )}
      </main>

      {saveError && <p className={styles.progressNote} role="alert">{saveError}</p>}

      <footer className={styles.duoFooter} dir="rtl">
        {step < TOTAL_CARDS ? (
          <button type="button" className={styles.duoBtnNext} onClick={advance}>التالي ←</button>
        ) : (
          <button type="button" className={`${styles.duoBtnNext} ${styles.duoBtnComplete}`} onClick={onCompletePractice}>
            ابدأ التدريبات الآن! ✍️
          </button>
        )}
        <button type="button" className={styles.duoBtnBack} disabled={step === 0} onClick={() => go(Math.max(0, step - 1))}>
          السابق →
        </button>
      </footer>
    </div>
  );
}