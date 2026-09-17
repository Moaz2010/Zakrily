"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { lessonsApi } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import styles from "./ScienceLearn.module.css";

const TOTAL_CARDS = 20;

const SENSES = [
  { en: "taste", ar: "حاسة التذوق", organ: "tongue", organAr: "اللسان", icon: "👅", sentence: "We taste with our tongue.", sentenceAr: "نتذوق بلساننا." },
  { en: "touch", ar: "حاسة اللمس", organ: "hands", organAr: "اليدين", icon: "✋", sentence: "We touch with our hands.", sentenceAr: "نلمس بأيدينا." },
  { en: "hearing", ar: "حاسة السمع", organ: "ears", organAr: "الأذنين", icon: "👂", sentence: "We hear with our ears.", sentenceAr: "نسمع بآذاننا." },
  { en: "sight", ar: "حاسة الإبصار", organ: "eyes", organAr: "العينين", icon: "👁️", sentence: "We see with our eyes.", sentenceAr: "نرى بأعيننا." },
  { en: "smell", ar: "حاسة الشم", organ: "nose", organAr: "الأنف", icon: "👃", sentence: "We smell with our nose.", sentenceAr: "نشم بأنفنا." },
] as const;

const WORDS = [
  ["taste", "حاسة التذوق", "We taste with our tongue."],
  ["touch", "حاسة اللمس", "We touch with our hands."],
  ["hearing", "حاسة السمع", "We hear with our ears."],
  ["sight", "حاسة الإبصار", "We see with our eyes."],
  ["smell", "حاسة الشم", "We smell with our nose."],
  ["fire", "حريق / نار", "If we smell smoke, we know there's a fire."],
  ["smoke", "دخان", "Look at the dark smoke."],
  ["voices", "أصوات بشرية", "I hear music and voices with my ears."],
  ["tongue", "لسان", "I taste food with my tongue."],
  ["soft", "ناعم / لين", "I can touch soft things with my fingers."],
  ["hard", "صلب / خشن", "I touch soft and hard things with my hands."],
  ["colorful", "ملون", "I can see the colorful butterflies."],
  ["butterflies", "فراشات", "Butterflies are colorful."],
  ["safe", "آمن", "Senses help us stay safe."],
  ["amazing", "رائع / مذهل", "We'll learn about our amazing senses."],
  ["excellent", "رائع / ممتاز", "Excellent, Salma!"],
  ["beautiful", "جميل", "What a beautiful day in the school garden!"],
  ["understand", "يفهم", "Senses help us understand the world around us."],
] as const;

const DIALOGUE: { who: string; line: string; teacher?: boolean }[] = [
  { who: "Ms. Mona", line: "Good morning, children! What a beautiful day in the school garden.", teacher: true },
  { who: "Sami", line: "Good morning, Ms. Mona! What will we learn today?" },
  { who: "Ms. Mona", line: "Today, we'll learn about our amazing senses.", teacher: true },
  { who: "Sami", line: "What are senses, Ms. Mona?" },
  { who: "Ms. Mona", line: "Senses help us understand the world around us — like sight, hearing, and smell.", teacher: true },
  { who: "Sami", line: "I can hear birds singing!" },
  { who: "Ms. Mona", line: "Yes! That's your sense of hearing. What else can we use?", teacher: true },
  { who: "Salma", line: "I can smell the flowers and see the colorful butterflies!" },
  { who: "Ms. Mona", line: "Excellent, Salma! Those are your senses of smell and sight. Senses also help us stay safe.", teacher: true },
  { who: "Sami", line: "Ms. Mona, how do our senses help us stay safe?" },
  { who: "Ms. Mona", line: "That's a great question, Sami! For example, if we smell smoke, we know there's a fire.", teacher: true },
];

const LISTENING = [
  "I taste delicious food with my tongue.",
  "I touch soft and hard things with my hands.",
  "I smell flowers in the garden with my nose.",
  "I hear music and voices with my ears.",
  "I see colors and shapes with my eyes.",
];

const PASSAGE = "The five senses help us understand the world around us. We see shapes, colors and people with our eyes. We use our nose to smell the beautiful flowers. With our hands, we can touch things. We hear the birds singing with our ears. Our tongue lets us taste delicious food. Our senses help us stay safe. If we smell smoke, we know there's a fire.";

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

function MatchSenses() {
  const organs = useMemo(
    () => [...SENSES].sort(() => Math.random() - 0.5).map((sense) => ({
      en: sense.organ, ar: sense.organAr, icon: sense.icon, sense: sense.en,
    })),
    [],
  );
  const [sense, setSense] = useState<string | null>(null);
  const [organ, setOrgan] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const picked = useRef({ sense: null as string | null, organ: null as string | null });

  function tryMatch(nextSense: string | null, nextOrgan: string | null) {
    if (!nextSense || !nextOrgan) return;
    const expected = SENSES.find((item) => item.en === nextSense)?.organ;
    picked.current = { sense: null, organ: null };
    setSense(null);
    setOrgan(null);
    if (expected === nextOrgan) {
      setMatched((previous) => {
        const next = [...new Set([...previous, nextSense])];
        setStatus(next.length === SENSES.length ? "✨ ممتاز! ربطت كل حاسة بعضوها الصح." : "✨ تمام! كمّل الباقي.");
        return next;
      });
    } else {
      setStatus("🔍 فكر تاني! كل حاسة ليها عضو مختلف.");
    }
  }

  return (
    <div className={styles.challenge} dir="rtl">
      <span className={styles.eyebrow}>🎮 وصل الحاسة بالعضو</span>
      <h4>اضغط حاسة، وبعدين اضغط عضو الجسم المناسب.</h4>
      <div className={styles.matchBoard}>
        <div className={styles.matchCol}>
          <span>الحاسة</span>
          {SENSES.map((item) => (
            <button
              key={item.en}
              type="button"
              aria-pressed={sense === item.en}
              data-matched={matched.includes(item.en) ? "true" : "false"}
              disabled={matched.includes(item.en)}
              onClick={() => {
                picked.current.sense = item.en;
                setSense(item.en);
                tryMatch(item.en, picked.current.organ);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.en}
            </button>
          ))}
        </div>
        <div className={styles.matchCol}>
          <span>العضو</span>
          {organs.map((item) => (
            <button
              key={item.en}
              type="button"
              aria-pressed={organ === item.en}
              data-matched={matched.includes(item.sense) ? "true" : "false"}
              disabled={matched.includes(item.sense)}
              onClick={() => {
                picked.current.organ = item.en;
                setOrgan(item.en);
                tryMatch(picked.current.sense, item.en);
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.en}
            </button>
          ))}
        </div>
      </div>
      {status && <p className={styles.feedback} role="status">{status}</p>}
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

export function EnglishLearn({
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
    <div className={`${styles.learnContainer} ${styles.englishLearn}`} dir="ltr" lang="en" aria-label="Explore English Lesson 1">
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
          <CardShell icon="🌸" badge="أهلاً يا بطل! 🚀 LESSON 1" title="What are the Five Senses?" hint="هيا نتعرف على حواسنا الخمس!">
            <p dir="rtl" className="text-sm font-bold text-[#292c32]">
              في هذا الدرس هنتعلم الحواس الخمس، جزء الجسم اللي بنستخدمه في كل حاسة، وإزاي الحواس تخلينا نفهم العالم ونفضل آمنين.
            </p>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">🎯</span>
              <div>
                <strong>هنتعلم 3 حاجات مهمة:</strong>
                <p>الحواس الخمس، أعضاء الجسم، وإزاي نفضل آمنين لو شمينا دخان.</p>
              </div>
            </div>
            <div className={styles.senseGrid}>
              {SENSES.map((sense) => (
                <article key={sense.en} className={styles.senseTile}>
                  <span className={styles.bigEmoji} aria-hidden="true">{sense.icon}</span>
                  <strong>{sense.en}</strong>
                  <small dir="rtl">{sense.ar}</small>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 1 && (
          <CardShell icon="🎯" badge="أهداف الدرس | OBJECTIVES" title="What You Will Learn" hint="إيه اللي هنعرفه النهاردة؟">
            <div className={styles.stack}>
              {[
                ["👅", "Name the five senses", "نسمي الحواس الخمس"],
                ["✋", "Match each sense to a body part", "نربط كل حاسة بعضو في الجسم"],
                ["🛡️", "Say how senses help us stay safe", "نقول إزاي الحواس بتحمينا"],
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
          <CardShell icon="🖐️" badge="مفهوم أساسي | CONCEPT" title="Our Five Senses" hint="عندنا خمس حواس — كل حاسة ليها عضو">
            <div className={styles.senseGrid}>
              {SENSES.map((sense) => (
                <article key={sense.en} className={styles.senseTile}>
                  <span className={styles.bigEmoji} aria-hidden="true">{sense.icon}</span>
                  <strong>{sense.en}</strong>
                  <small dir="rtl">{sense.ar}</small>
                  <span className={styles.pill}>{sense.organ} · {sense.organAr}</span>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {SENSES.map((sense, index) => step === index + 3 && (
          <CardShell
            key={sense.en}
            icon={sense.icon}
            badge={`${index + 1}. ${sense.ar.toUpperCase()} | ${sense.en.toUpperCase()}`}
            title={`${sense.en[0].toUpperCase()}${sense.en.slice(1)}`}
            hint={`${sense.sentenceAr} (${sense.organAr})`}
          >
            <article className={styles.conceptCard}>
              <span className={styles.bigEmoji} aria-hidden="true">{sense.icon}</span>
              <h4 dir="ltr">{sense.sentence}</h4>
              <p dir="rtl">{sense.sentenceAr}</p>
              <span className={styles.pill}>{sense.organ} · {sense.organAr}</span>
            </article>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">💡</span>
              <div>
                <strong>افتكر النمط:</strong>
                <p>We {sense.en === "sight" ? "see" : sense.en === "hearing" ? "hear" : sense.en} with our {sense.organ}.</p>
              </div>
            </div>
          </CardShell>
        ))}

        {step === 8 && (
          <CardShell icon="🎮" badge="اختبر نفسك! | MINI GAME" title="Match the body part" hint="وصل كل حاسة بعضوها">
            <MatchSenses />
          </CardShell>
        )}

        {step === 9 && (
          <CardShell icon="🌍" badge="ليش الحواس مهمة؟ | WHY" title="Two Big Jobs" hint="الحواس بتعمل حاجتين كبار">
            <div className={styles.compare}>
              <article className={styles.living}>
                <span className={styles.bigEmoji} aria-hidden="true">🌈</span>
                <h4>Understand the world</h4>
                <small className={styles.englishHint} dir="rtl">نفهم العالم حوالينا</small>
                <p>Seeing colors, hearing birds, smelling flowers.</p>
                <span className={styles.pill}>sight · hearing · smell</span>
              </article>
              <article className={styles.nonliving}>
                <span className={styles.bigEmoji} aria-hidden="true">🛡️</span>
                <h4>Stay safe</h4>
                <small className={styles.englishHint} dir="rtl">نفضل آمنين</small>
                <p>If we smell smoke, we know there is a fire.</p>
                <span className={styles.pill}>smoke → fire</span>
              </article>
            </div>
          </CardShell>
        )}

        {step === 10 && (
          <CardShell icon="🔥" badge="نصيحة الأمان | SAFETY" title="Smoke means fire!" hint="لو شمينا دخان… في حريق">
            <article className={styles.safety} dir="rtl">
              <span aria-hidden="true">🔥</span>
              <div>
                <h4>حاسة الشم بتحمينا</h4>
                <p className="text-sm font-semibold">If we smell smoke, we know there's a fire.</p>
                <p className="text-xs mt-1">لو شمينا دخان (smoke)، نعرف إن في حريق (fire).</p>
              </div>
            </article>
            <MiniQuiz
              eyebrow="👆 تحدي سريع"
              question="If we smell smoke, we know there's a ______."
              options={[["🔥", "fire"], ["🌸", "flower"], ["🐦", "bird"]]}
              correct="fire"
              success="✨ برافو! الدخان علامة على الحريق."
              retry="🔍 فكر تاني! Smell smoke → fire."
            />
          </CardShell>
        )}

        {step === 11 && (
          <CardShell icon="💬" badge="كلمات مهمة | VOCABULARY" title="More Useful Words" hint="كلمات هتحتاجها في التمارين">
            <div className={styles.wordGrid}>
              {[
                ["🔥", "fire", "حريق / نار"],
                ["💨", "smoke", "دخان"],
                ["🗣️", "voices", "أصوات بشرية"],
                ["👅", "tongue", "لسان"],
                ["🧸", "soft", "ناعم / لين"],
                ["🪨", "hard", "صلب / خشن"],
                ["🎨", "colorful", "ملون"],
                ["🦋", "butterflies", "فراشات"],
                ["⭐", "excellent", "رائع / ممتاز"],
                ["🌸", "beautiful", "جميل"],
              ].map(([icon, en, ar]) => (
                <article key={en} className={styles.vocabTile}>
                  <span className="text-2xl block mb-1" aria-hidden="true">{icon}</span>
                  <strong>{en}</strong>
                  <small dir="rtl">{ar}</small>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step === 12 && (
          <CardShell icon="🗣️" badge="هيا نتحدث | DIALOGUE" title="Let's Talk About Our Senses" hint="مس منى وسامي وسلمة في حديقة المدرسة">
            <p className={styles.helper} dir="rtl">اقرأ الحوار زي ما في الدرس. مس منى معلمة، وسامي وسلمة بيتكلموا عن الحواس.</p>
            <div className={styles.speechList}>
              {DIALOGUE.map((turn, index) => (
                <p key={index} className={`${styles.speech} ${turn.teacher ? styles.speechTeacher : ""}`} dir="ltr">
                  <span className={styles.speechName}>{turn.teacher ? "👩‍🏫 " : turn.who === "Salma" ? "👧 " : "👦 "}{turn.who}</span>
                  {turn.line}
                </p>
              ))}
            </div>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">📝</span>
              <div>
                <strong>أسئلة الفهم من الحوار:</strong>
                <p className="text-sm">جاوب على الأسئلة دي من الحوار اللي قرأته.</p>
              </div>
            </div>
            <MiniQuiz
              eyebrow="سؤال 1"
              question="Ms. Mona is our math teacher."
              options={[["✅", "True"], ["❌", "False"]]}
              correct="False"
              success="✨ صح! الحوار مبيقولش إن مس منى معلمة رياضيات."
              retry="🔍 ارجع للحوار: مس منى بتشرح الحواس، مش رياضيات."
            />
            <MiniQuiz
              eyebrow="سؤال 2"
              question="We will learn about our houses today."
              options={[["✅", "True"], ["❌", "False"]]}
              correct="False"
              success="✨ ممتاز! مس منى قالت: we'll learn about our amazing senses."
              retry="🔍 ارجع للحوار: مش بيوت — حواس."
            />
            <MiniQuiz
              eyebrow="سؤال 3"
              question="Senses help us understand the world around us."
              options={[["✅", "True"], ["❌", "False"]]}
              correct="True"
              success="✨ برافو! مس منى قالت: Senses help us understand the world around us."
              retry="🔍 ارجع للحوار: الجملة موجودة في الحوار."
            />
            <MiniQuiz
              eyebrow="سؤال 4"
              question="Our senses are like sight, hearing and smell."
              options={[["✅", "True"], ["❌", "False"]]}
              correct="True"
              success="✨ تمام! مس منى ذكرت: like sight, hearing, and smell."
              retry="🔍 ارجع للحوار: الحواس بتشمل sight, hearing, smell."
            />
          </CardShell>
        )}

        {step === 13 && (
          <CardShell icon="👂" badge="استماع | LISTENING" title="Listen and Say" hint="جمل قصيرة عن كل حاسة">
            <div className={styles.stack}>
              {LISTENING.map((line, index) => (
                <p key={line} className={styles.bullet}>
                  <span aria-hidden="true">{index + 1}</span>
                  <span dir="ltr">{line}</span>
                </p>
              ))}
            </div>
            <MiniQuiz
              eyebrow="👆 تحدي سريع للأبطال"
              question="You use your sense of ______ to listen to music."
              options={[["👂", "hearing"], ["👁️", "sight"], ["👃", "smell"]]}
              correct="hearing"
              success="✨ تمام! Listening to music uses hearing."
              retry="🔍 فكر تاني! نسمع الموسيقى بحاسة السمع (hearing)."
            />
          </CardShell>
        )}

        {step === 14 && (
          <CardShell icon="📖" badge="قراءة | READING" title="The Five Senses" hint="قطعة القراءة من الدرس">
            <p className={styles.passage} dir="ltr">{PASSAGE}</p>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">📝</span>
              <div>
                <strong>أسئلة الفهم من القطعة:</strong>
                <p className="text-sm">جاوب على الأسئلة دي من القطعة اللي قرأتها.</p>
              </div>
            </div>
            <MiniQuiz
              eyebrow="سؤال 1"
              question="We use our ______ to see shapes and colors."
              options={[["👁️", "eyes"], ["👃", "nose"], ["👂", "ears"]]}
              correct="eyes"
              success="✨ نعم! We see with our eyes."
              retry="🔍 القطعة بتقول: We see shapes, colors and people with our eyes."
            />
            <MiniQuiz
              eyebrow="سؤال 2"
              question="The text is about our ______."
              options={[["🏫", "school"], ["🗑️", "trash"], ["🍎", "food"], ["✋", "senses"]]}
              correct="senses"
              success="✨ ممتاز! القطعة كلها بتشرح الحواس الخمس."
              retry="🔍 القطعة بتشرح عمل الحواس الخمس، مش مدرسة أو أكل."
            />
            <MiniQuiz
              eyebrow="سؤال 3"
              question="What do the five senses help us do?"
              options={[["🎯", "Understand the world and stay safe"], ["🏃", "Run fast"], ["🎮", "Play games"]]}
              correct="Understand the world and stay safe"
              success="✨ صح! الحواس بتساعدنا نفهم العالم ونفضل آمنين."
              retry="🔍 القطعة بتقول: help us understand the world around us and help us stay safe."
            />
            <MiniQuiz
              eyebrow="سؤال 4"
              question="Which sense helps us smell flowers?"
              options={[["👁️", "sight"], ["👃", "smell"], ["👂", "hearing"]]}
              correct="smell"
              success="✨ نعم! حاسة الشم بتساعدنا نشم الزهور."
              retry="🔍 القطعة بتقول: We use our nose to smell the beautiful flowers."
            />
            <MiniQuiz
              eyebrow="سؤال 5"
              question="Which body part do we use to taste food?"
              options={[["👃", "nose"], ["👂", "ears"], ["👅", "tongue"]]}
              correct="tongue"
              success="✨ برافو! بنستخدم اللسان عشان نتذوق الأكل."
              retry="🔍 القطعة بتقول: Our tongue lets us taste delicious food."
            />
          </CardShell>
        )}

        {step === 15 && (
          <CardShell icon="📖" badge="مهارة القراءة | READING SKILL" title="Meaning in Context" hint="نلاقي المضاد والمرادف">
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">💡</span>
              <div>
                <strong>مهارة الدرس:</strong>
                <p>نحدد معنى الكلمة من الجملة: المضاد (opposite) والمرادف (synonym).</p>
              </div>
            </div>
            <MiniQuiz
              eyebrow="Opposite / المضاد"
              question='The opposite of "safe" is ______.'
              options={[["⚠️", "dangerous"], ["💪", "healthy"], ["🐘", "huge"]]}
              correct="dangerous"
              success="✨ نعم! safe ↔ dangerous."
              retry="🔍 المضاد يعني العكس. عكس آمن هو خطر (dangerous)."
            />
          </CardShell>
        )}

        {step === 16 && (
          <CardShell icon="✨" badge="مرادف | SYNONYM" title='"Amazing" means…' hint="amazing = wonderful">
            <MiniQuiz
              eyebrow="Word meaning / معنى الكلمة"
              question='The word "amazing" means ______.'
              options={[["🌟", "wonderful"], ["😴", "tired"], ["😢", "sad"], ["🆓", "free"]]}
              correct="wonderful"
              success="✨ برافو! amazing و wonderful نفس المعنى تقريبًا."
              retry="🔍 amazing معناها رائع / مذهل → wonderful."
              columns={2}
            />
          </CardShell>
        )}

        {step === 17 && (
          <CardShell icon="📝" badge="الأفعال | VERBS" title="Present and Past" hint="أفعال الدرس في المضارع والماضي">
            <div className={styles.tableRow}><span><strong>Present</strong></span><span><strong>Past</strong></span></div>
            {[
              ["use", "used"],
              ["taste", "tasted"],
              ["touch", "touched"],
              ["hear", "heard"],
              ["sing", "sang"],
              ["understand", "understood"],
            ].map(([present, past]) => (
              <div className={styles.tableRow} key={present}>
                <span>{present}</span>
                <span>{past}</span>
              </div>
            ))}
            <p className={styles.helper} dir="rtl">hear → heard و sing → sang أفعال شاذة (irregular).</p>
            <MiniQuiz
              eyebrow="حرف الجر"
              question="I hear ______ my ears."
              options={[["✅", "with"], ["📍", "on"], ["📦", "of"]]}
              correct="with"
              success="✨ النمط ثابت: hear / see / taste with + body part."
              retry="🔍 بنقول hear with our ears."
            />
          </CardShell>
        )}

        {step === 18 && (
          <CardShell icon="💬" badge="تعبيرات | EXPRESSIONS" title="Useful Phrases" hint="جمل وتعبيرات من الحوار">
            <div className={styles.stack}>
              {[
                ["learn about", "يتعلم عن"],
                ["stay safe", "يبقى آمنًا"],
                ["talk about", "يتحدث عن"],
                ["What a beautiful day!", "يا له من يوم جميل!"],
                ["hear / see / taste with", "نسمع / نرى / نتذوق بـ"],
              ].map(([en, ar]) => (
                <article key={en} className={styles.factRow}>
                  <div>
                    <strong dir="ltr">{en}</strong>
                    <small className={styles.englishHint} dir="rtl">{ar}</small>
                  </div>
                </article>
              ))}
            </div>
            <MiniQuiz
              eyebrow="Punctuation / الترقيم"
              question="Choose the correct sentence."
              options={[["❓", "What will we learn today?"], [" .", "what will we learn today."], ["!", "What will we learn today"]]}
              correct="What will we learn today?"
              success="✨ سؤال → حرف كبير + علامة استفهام."
              retry="🔍 السؤال بيبدأ بحرف كبير وبيخلص بـ ?"
            />
          </CardShell>
        )}

        {step === 19 && (
          <CardShell icon="⭐" badge="ملخص الدرس | SUMMARY" title="What You Discovered!" hint="أهم اللي لازم نفتكره">
            <article className={styles.conceptCard}>
              <span className={styles.bigEmoji} aria-hidden="true">👅 ✋ 👂 👁️ 👃</span>
              <h4 dir="rtl">أهم ما يجب تذكره:</h4>
              <p dir="rtl" className="text-sm font-semibold leading-7">
                خمس حواس: التذوق باللسان، اللمس باليدين، السمع بالأذن، الإبصار بالعين، الشم بالأنف.
                الحواس تخلينا نفهم العالم ونفضل آمنين — لو شمينا دخان، نعرف إن في حريق.
                safe عكسها dangerous، و amazing معناها wonderful.
              </p>
            </article>
            <div className={styles.wordGrid}>
              {WORDS.slice(0, 8).map(([en, ar, example]) => (
                <article key={en} className={styles.vocabTile}>
                  <strong dir="ltr">{en}</strong>
                  <small dir="rtl">{ar}</small>
                  <span className={styles.pill} dir="ltr">{example}</span>
                </article>
              ))}
            </div>
          </CardShell>
        )}

        {step >= TOTAL_CARDS && (
          <div className={styles.duoCelebrationCard} dir="rtl">
            <span className={styles.celebrationIcon} aria-hidden="true">🌟 🏆 👂</span>
            <h3>ماشاء الله! أتممت شرح الحواس الخمس!</h3>
            <p>اتعلمت الحواس الخمس، أعضاء الجسم، وإزاي الحواس تحمينا. جاهز للتدريبات!</p>
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
