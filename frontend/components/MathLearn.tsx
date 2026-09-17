"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { lessonsApi } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import styles from "./ScienceLearn.module.css";

const TOTAL_CARDS = 20;

const PLACES = [
  "Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands",
  "Hundred Thousands", "Millions", "Ten Millions", "Hundred Millions", "Milliards",
];

const MOON = [
  { digit: "3", place: "Hundred Thousands", placeAr: "مئات الآلاف", value: "300,000" },
  { digit: "8", place: "Ten Thousands", placeAr: "عشرات الآلاف", value: "80,000" },
  { digit: "4", place: "Thousands", placeAr: "الآلاف", value: "4,000" },
  { digit: "4", place: "Hundreds", placeAr: "المئات", value: "400" },
  { digit: "0", place: "Tens", placeAr: "العشرات", value: "0" },
  { digit: "2", place: "Ones", placeAr: "الآحاد", value: "2" },
];

function MiniQuiz({
  eyebrow, question, options, correct, success, retry, columns = 2,
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

function DigitExplorer() {
  const [picked, setPicked] = useState(1);
  const item = MOON[picked];
  return (
    <div>
      <p className={styles.helper} dir="rtl">اضغط على رقم في 384,402 عشان تشوف مكانه وقيمته.</p>
      <div className={styles.periodDigits} dir="ltr" style={{ margin: "8px 0 12px" }}>
        {MOON.map((cell, index) => (
          <button
            key={`${cell.place}-${index}`}
            type="button"
            className={styles.digitKey}
            aria-pressed={picked === index}
            aria-label={`${cell.digit} in the ${cell.place} place`}
            onClick={() => setPicked(index)}
          >
            {cell.digit}
          </button>
        ))}
      </div>
      <article className={styles.conceptCard} dir="ltr">
        <span className={styles.bigEmoji} aria-hidden="true">🔢</span>
        <h4>Digit {item.digit}</h4>
        <p>Place value: <strong>{item.place}</strong></p>
        <p>Value: <strong>{item.value}</strong></p>
        <span className={styles.pill} dir="rtl">{item.placeAr} ← {item.value}</span>
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

export function MathLearn({
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
      setStep(nextStep >= TOTAL_CARDS ? TOTAL_CARDS - 1 : nextStep);
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
          setStep(nextStep >= TOTAL_CARDS ? TOTAL_CARDS - 1 : nextStep);
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
    <div className={`${styles.learnContainer} ${styles.mathLearn}`} dir="ltr" lang="en" aria-label="Explore Math Lesson 1">
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
          <CardShell icon="🔢" badge="أهلاً يا بطل! 🚀 LESSON 1" title="Big Numbers!" hint="هنتعلم القيمة المكانية للأرقام الكبيرة">
            <p dir="rtl" className="text-sm font-bold text-[#292c32]">
              الرقم الكبير مش صعب لو قطعناه مجموعات تلاتة تلاتة. كل رقم قيمته بتتغير حسب مكانه.
            </p>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">🎯</span>
              <div>
                <strong>هنتعلم 3 حاجات:</strong>
                <p>مكان الرقم · الفترات (periods) · المليون والمليار</p>
              </div>
            </div>
          </CardShell>
        )}

        {step === 1 && (
          <CardShell icon="🎯" badge="أهداف الدرس | OBJECTIVES" title="What You Will Learn" hint="إيه اللي هنعرفه النهاردة؟">
            <div className={styles.stack}>
              {[
                ["📍", "Name the place of any digit", "نسمي مكان أي رقم"],
                ["💰", "Write the value of a digit", "نكتب قيمة الرقم"],
                ["✂️", "Read big numbers in periods", "نقرأ العدد على فترات"],
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
          <CardShell icon="2️⃣" badge="فكرة مهمة | CONCEPT" title="Same digit, different value" hint="نفس الرقم… قيم مختلفة">
            <article className={styles.conceptCard}>
              <span className={styles.bigEmoji} aria-hidden="true">222</span>
              <h4 dir="rtl">في العدد 222 الأرقام شكلها واحد، بس قيمتها مش واحدة.</h4>
              <p dir="ltr">200 + 20 + 2</p>
              <span className={styles.pill}>Hundreds 200 · Tens 20 · Ones 2</span>
            </article>
            <MiniQuiz
              eyebrow="هل توافق أمير؟"
              question="Amir says in 222 all digits have the same value."
              options={[["❌", "Disagree"], ["✅", "Agree"]]}
              correct="Disagree"
              success="✨ صح! المكان بيغيّر القيمة: 200 و 20 و 2."
              retry="🔍 الشكل واحد (2) لكن المكان مختلف، فالقيمة مختلفة."
            />
          </CardShell>
        )}

        {step === 3 && (
          <CardShell icon="📛" badge="تعريفان | TWO NAMES" title="Place value ≠ Value" hint="الاسم ≠ الكمية">
            <div className={styles.compare}>
              <article className={styles.living}>
                <span className={styles.bigEmoji} aria-hidden="true">🏷️</span>
                <h4>Place value</h4>
                <small className={styles.englishHint} dir="rtl">اسم المكان</small>
                <p>Ten Thousands</p>
                <span className={styles.pill}>الاسم</span>
              </article>
              <article className={styles.nonliving}>
                <span className={styles.bigEmoji} aria-hidden="true">💵</span>
                <h4>Value</h4>
                <small className={styles.englishHint} dir="rtl">قيمة الرقم</small>
                <p>80,000</p>
                <span className={styles.pill}>الكمية</span>
              </article>
            </div>
            <p className={styles.helper} dir="rtl">في 384,402 الرقم 8 مكانه Ten Thousands وقيمته 80,000.</p>
          </CardShell>
        )}

        {step === 4 && (
          <CardShell icon="🌙" badge="مثال الكتاب | 384,402 km" title="Earth to the Moon" hint="أقل مسافة تقريبًا 384,402 كم">
            <DigitExplorer />
          </CardShell>
        )}

        {step === 5 && (
          <CardShell icon="✂️" badge="الفترات | PERIODS" title="Groups of three" hint="من اليمين: كل 3 أرقام = period">
            <p dir="rtl" className="text-sm font-bold">الفاصلة بتوريك الفترات. كل فترة فيها آحاد وعشرات ومئات.</p>
            <div className={styles.periodStrip} dir="ltr">
              <article className={styles.periodBox}>
                <small>THOUSANDS</small>
                <div className={styles.periodDigits}><span>3</span><span>8</span><span>4</span></div>
                <span className={styles.pill}>H T O</span>
              </article>
              <article className={styles.periodBox}>
                <small>ONES</small>
                <div className={styles.periodDigits}><span>4</span><span>0</span><span>2</span></div>
                <span className={styles.pill}>H T O</span>
              </article>
            </div>
          </CardShell>
        )}

        {step === 6 && (
          <CardShell icon="🗺️" badge="ترتيب الأماكن | PLACES" title="From the right" hint="نعد الأماكن من اليمين">
            <div className={styles.placeLine} dir="ltr">
              {PLACES.map((place) => (
                <span key={place} className={styles.placeChip}>{place}</span>
              ))}
            </div>
            <p className={styles.helper} dir="rtl">Ones → Tens → Hundreds → Thousands → … → Milliards</p>
          </CardShell>
        )}

        {step === 7 && (
          <CardShell icon="1️⃣" badge="مليون | MILLION" title="1,000,000" hint="أصغر عدد من 7 أرقام">
            <article className={styles.conceptCard}>
              <h4 dir="ltr">999,999 → 1,000,000</h4>
              <p dir="rtl">أكبر عدد من 6 أرقام، وبعده مباشرة المليون. نضيف فترة Millions على الشمال.</p>
              <span className={styles.pill}>One million · 7 digits</span>
            </article>
            <MiniQuiz
              eyebrow="حفظ القاعدة"
              question="A million is the smallest number formed from ______ digits."
              options={[["6️⃣", "6"], ["7️⃣", "7"], ["8️⃣", "8"]]}
              correct="7"
              success="✨ 1,000,000 فيها 7 أرقام."
              retry="🔍 عد الأرقام: 1 وستة أصفار = 7."
            />
          </CardShell>
        )}

        {step === 8 && (
          <CardShell icon="🇪🇬" badge="مثال مصر | 2020" title="102,334,404" hint="سكان مصر تقريبًا">
            <div className={styles.periodStrip} dir="ltr">
              {[["MILLIONS", "102"], ["THOUSANDS", "334"], ["ONES", "404"]].map(([name, digits]) => (
                <article key={name} className={styles.periodBox}>
                  <small>{name}</small>
                  <div className={styles.periodDigits}>{digits.split("").map((d, i) => <span key={i}>{d}</span>)}</div>
                </article>
              ))}
            </div>
            <p dir="ltr" className="text-sm font-semibold">One hundred two million, three hundred thirty-four thousand, four hundred four.</p>
            <span className={styles.pill}>102 million, 334 thousand, 404</span>
          </CardShell>
        )}

        {step === 9 && (
          <CardShell icon="🌍" badge="مليار | MILLIARD" title="1,000,000,000" hint="أصغر عدد من 10 أرقام">
            <article className={styles.conceptCard}>
              <h4 dir="ltr">One milliard = one billion</h4>
              <p dir="rtl">سكان الصين سنة 1980 وصلوا حوالي مليار. نضيف عمود Milliards شمال الملايين.</p>
              <span className={styles.pill}>1 + 9 zeros = 10 digits</span>
            </article>
            <MiniQuiz
              eyebrow="حفظ القاعدة"
              question="A milliard is the smallest number formed from ______ digits."
              options={[["7️⃣", "7"], ["9️⃣", "9"], ["🔟", "10"]]}
              correct="10"
              success="✨ 1 وبعده 9 أصفار = 10 أرقام."
              retry="🔍 المليار 1,000,000,000 — عد الأرقام."
            />
          </CardShell>
        )}

        {step === 10 && (
          <CardShell icon="📖" badge="طريقة القراءة | METHOD" title="How to read a big number" hint="3 خطوات من الكتاب">
            <div className={styles.stack}>
              {[
                ["1", "Divide from the right into periods of 3 (commas help)."],
                ["2", "Use the place-value chart if you need it."],
                ["3", "Read from the left: the digits, then the period name."],
              ].map(([n, text]) => (
                <p key={n} className={styles.bullet}><span>{n}</span><span dir="ltr">{text}</span></p>
              ))}
            </div>
          </CardShell>
        )}

        {step === 11 && (
          <CardShell icon="6️⃣" badge="مثال القراءة | 6,208,196,318" title="Read with periods" hint="6 | 208 | 196 | 318">
            <div className={styles.periodStrip} dir="ltr">
              {[["MILLIARDS", "6"], ["MILLIONS", "208"], ["THOUSANDS", "196"], ["ONES", "318"]].map(([name, digits]) => (
                <article key={name} className={styles.periodBox}>
                  <small>{name}</small>
                  <div className={styles.periodDigits}>{digits.split("").map((d, i) => <span key={name + i}>{d}</span>)}</div>
                </article>
              ))}
            </div>
            <p dir="ltr" className="text-sm font-semibold">Six milliard, two hundred eight million, one hundred ninety-six thousand, three hundred eighteen.</p>
            <span className={styles.pill}>6 milliard, 208 million, 196 thousand, 318</span>
          </CardShell>
        )}

        {step === 12 && (
          <CardShell icon="🔍" badge="قيمة الرقم | VALUE" title="Write the zeros" hint="الرقم + أصفار المكان">
            <p dir="rtl" className="text-sm font-bold">لو الرقم في Ten Thousands، نحط 4 أصفار بعده.</p>
            <MiniQuiz
              eyebrow="مثال الكتاب"
              question="In 79,285 the digit 9 is in Thousands. Its value is ______."
              options={[["9️⃣", "9"], ["9️⃣0️⃣0️⃣0️⃣", "9,000"], ["9️⃣0️⃣", "90"]]}
              correct="9,000"
              success="✨ place value = thousands، value = 9,000."
              retry="🔍 الاسم thousands، الكمية 9,000."
            />
          </CardShell>
        )}

        {step === 13 && (
          <CardShell icon="🎮" badge="اختبر نفسك | MINI GAME" title="Which digit?" hint="3,418,079,265">
            <p dir="ltr" className="text-xs font-semibold">Periods: 3 | 418 | 079 | 265</p>
            <MiniQuiz
              eyebrow="Hundred Thousands"
              question="In 3,418,079,265 the Hundred Thousands digit is ______."
              options={[["0️⃣", "0"], ["9️⃣", "9"], ["3️⃣", "3"]]}
              correct="0"
              success="✨ Thousands period = 079 → hundreds digit = 0."
              retry="🔍 Hundred Thousands = المئات في فترة الآلاف → 0."
            />
          </CardShell>
        )}

        {step === 14 && (
          <CardShell icon="0️⃣" badge="قاعدة الصفر | ZERO" title="Zero is always 0" hint="0 × أي مكان = 0">
            <article className={styles.safety} dir="rtl">
              <span aria-hidden="true">0️⃣</span>
              <div>
                <h4>الصفر قيمته صفر في أي مكان</h4>
                <p>In 301,572,941 the 0 is in Ten Millions, but its value is still 0.</p>
              </div>
            </article>
            <MiniQuiz
              eyebrow="اختبر الفكرة"
              question="The value of the digit 0 in 301,572,941 is ______."
              options={[["0️⃣", "0"], ["💯", "100,000"], ["1️⃣0️⃣0️⃣0️⃣", "1,000"]]}
              correct="0"
              success="✨ حتى لو مكانه كبير، صفر × المكان = 0."
              retry="🔍 الكتاب بيأكد: digit 0 has value 0 in every place."
            />
          </CardShell>
        )}

        {step === 15 && (
          <CardShell icon="📝" badge="من كلمة لرقم | STANDARD FORM" title="Fill each period" hint="كل فترة لازم 3 أرقام">
            <p dir="rtl" className="text-sm font-bold">لو الفترة فاضية، نحط أصفار. 9 milliard, 9 million, 9 thousand, 9 → 9,009,009,009</p>
            <MiniQuiz
              eyebrow="حوّل للكتابة القياسية"
              question="701 million, 7 thousand, 700 ="
              options={[["A", "701,007,700"], ["B", "701,770,000"], ["C", "71,007,700"]]}
              correct="701,007,700"
              success="✨ 701 | 007 | 700"
              retry="🔍 آلاف = 007 مش 7 لوحدها."
            />
          </CardShell>
        )}

        {step === 16 && (
          <CardShell icon="⚠️" badge="أخطاء شائعة | MISTAKES" title="Watch out!" hint="3 لخبطات من الدرس">
            <div className={styles.stack}>
              {[
                ["لا تقول إن 222 كل أرقامها نفس القيمة — المكان بيغيّر القيمة."],
                ["Place value اسم المكان، Value الكمية."],
                ["متنقراش الرقم رقم رقم. اقطعه فترات وسمّي كل فترة."],
              ].map(([text]) => (
                <article key={text} className={styles.factRow} dir="rtl">
                  <span aria-hidden="true">💡</span>
                  <strong>{text}</strong>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 17 && (
          <CardShell icon="💬" badge="كلمات | VOCABULARY" title="Words to keep" hint="مفردات الدرس">
            <div className={styles.wordGrid}>
              {[
                ["digit", "رقم من 0 إلى 9"],
                ["place value", "اسم المكان"],
                ["value", "قيمة الرقم"],
                ["period", "مجموعة 3 أرقام"],
                ["million", "1,000,000"],
                ["milliard", "1,000,000,000"],
              ].map(([en, ar]) => (
                <article key={en} className={styles.vocabTile}>
                  <strong dir="ltr">{en}</strong>
                  <small dir="rtl">{ar}</small>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 18 && (
          <CardShell icon="🎮" badge="تحدي سريع | QUIZ" title="Ten Millions" hint="1,351,278">
            <MiniQuiz
              eyebrow="من تمارين الدرس"
              question="The digit in the Ten Thousands place in 1,351,278 is ______."
              options={[["3️⃣", "3"], ["5️⃣", "5"], ["2️⃣", "2"], ["1️⃣", "1"]]}
              correct="5"
              success="✨ 1 | 351 | 278 → Ten Thousands = 5"
              retry="🔍 فترة الآلاف 351: Hundred Thousands=3, Ten Thousands=5, Thousands=1."
              columns={2}
            />
          </CardShell>
        )}

        {step === 19 && (
          <CardShell icon="⭐" badge="ملخص الدرس | SUMMARY" title="What to remember" hint="أهم القواعد">
            <article className={styles.conceptCard} dir="rtl">
              <h4>افتكر:</h4>
              <p className="text-sm font-semibold leading-7">
                قيمة الرقم حسب مكانه. كل 3 أرقام من اليمين = period: Ones، Thousands، Millions، Milliards.
                المليون 7 أرقام، المليار 10 أرقام. Place value = الاسم، Value = الكمية. الصفر قيمته صفر.
              </p>
            </article>
            <span className={styles.pill} dir="ltr">1,000 thousands = 1 million · 1,000 millions = 1 milliard</span>
          </CardShell>
        )}

        {step >= TOTAL_CARDS && (
          <div className={styles.duoCelebrationCard} dir="rtl">
            <span className={styles.celebrationIcon} aria-hidden="true">🌟 🏆 🔢</span>
            <h3>ماشاء الله! أتممت شرح الأعداد الكبيرة!</h3>
            <p>عرفت المكان والقيمة والفترات والمليون والمليار. جاهز للتدريبات!</p>
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
