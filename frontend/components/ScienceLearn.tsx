"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { lessonsApi, type LessonDetailOut } from "@/lib/api";
import styles from "./ScienceLearn.module.css";
import { observationCards, ScienceObservationCard } from "./ScienceObservationCards";
import { useLearner } from "@/lib/learner-context";

type Section = LessonDetailOut["sections"][number];

const icons: Record<string, string> = {
  Sparrow: "🐦",
  Spider: "🕷️",
  Lizard: "🦎",
  Scorpion: "🦂",
  "Dung beetle": "🪲",
  Feeding: "🥕",
  Growth: "🌱",
  Breathing: "🌬️",
  Habitat: "🏡",
  Nature: "🌿",
  Shelter: "🛖",
  Damp: "💧",
  Characteristics: "🔎",
  "Living organisms": "🌱",
  "Non-living things": "🪨",
};

const arabicLabels: Record<string, string> = {
  "Living organisms": "الكائنات الحية",
  "Non-living things": "الأشياء غير الحية (الجمادات)",
  Characteristics: "الخصائص والتأثيرات",
  Feeding: "التغذية (أخذ الطعام)",
  Growth: "النمو (زيادة الحجم مع الوقت)",
  Breathing: "التنفس (استنشاق الهواء)",
  Habitat: "الموئل (بيئة أو موطن الكائن الحي)",
  Nature: "الطبيعة",
  Shelter: "المأوى (المكان الآمن للحماية)",
  Damp: "رطب (فيه نسبة رطوبة وماء)",
};

function clean(text: string) {
  return text.replace(/^---\s*$/gm, "").trim();
}

function blocks(text: string) {
  const parts = clean(text).split(/^### (.+)$/m);
  return Array.from({ length: Math.floor(parts.length / 2) }, (_, i) => ({
    title: parts[i * 2 + 1].trim(),
    body: clean(parts[i * 2 + 2]),
  }));
}

function inline(text: string): ReactNode {
  const displayText = text.replace(/Example\s*\/\s*Context:/g, "مثال / توضيح:").replace(/\s*=\s*/g, " → ");
  return displayText
    .split(/(\*\*.*?\*\*)/g)
    .map((part, index) =>
      part.startsWith("**")
        ? <strong key={index}>{part.slice(2, -2).replace(/[*#]/g, "")}</strong>
        : part.replace(/[*#]/g, "")
    );
}

/** Renders short, bite-sized text lines */
function ShortSourceText({ text }: { text: string }) {
  const lines = clean(text).split("\n").filter((line) => line.trim());
  return (
    <div className={styles.source}>
      {lines.map((line, index) => {
        if (/^\|[- |]+\|$/.test(line)) return null;
        if (line.startsWith("|"))
          return (
            <div className={styles.tableRow} key={index}>
              {line
                .split("|")
                .filter((cell) => cell.trim())
                .map((cell, i) => (
                  <span key={i}>{inline(cell.trim())}</span>
                ))}
            </div>
          );
        const bullet = /^(?:\* |\d+\. )/.test(line);
        return (
          <p className={bullet ? styles.bullet : undefined} key={index}>
            {bullet && <span aria-hidden="true">✦</span>}
            <span>{inline(line.replace(/^(?:### |\* |\d+\. )/, ""))}</span>
          </p>
        );
      })}
    </div>
  );
}

function Reveal({ title, icon = "🔍", children }: { title: string; icon?: string; children: ReactNode }) {
  return (
    <details className={styles.reveal}>
      <summary>
        <span aria-hidden="true">{icon}</span>
        <span>{title}</span>
        <span className={styles.plus} aria-hidden="true">
          ＋
        </span>
      </summary>
      <div className={styles.revealed}>{children}</div>
    </details>
  );
}

function LifeChoice() {
  const [choice, setChoice] = useState<string | null>(null);
  return (
    <div className={styles.challenge} dir="rtl">
      <span className={styles.eyebrow}>👆 تحدي سريع للأبطال</span>
      <h4>أي مما يلي يُعد كائناً حيّاً؟ (Living organism)</h4>
      <div className={styles.choices}>
        {[
          ["🌱", "نبات (Plant)"],
          ["🪨", "صخرة (Rock)"],
          ["💧", "ماء (Water)"],
        ].map(([icon, name]) => (
          <button key={name} aria-pressed={choice === name} onClick={() => setChoice(name)}>
            <span aria-hidden="true">{icon}</span>
            {name}
          </button>
        ))}
      </div>
      {choice && (
        <p className={styles.feedback} role="status">
          {choice.includes("نبات")
            ? "✨ ممتاز يا بطل! النبات كائن حي يتغذى وينمو ويتنفس."
            : "🔍 فكر تاني! الكائن الحي يتغذى وينمو ويتنفس. حاول مرة تانية!"}
        </p>
      )}
    </div>
  );
}

function ScientistQuestion({ text }: { text: string }) {
  const answerId = useId();
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const problem = text.split("**Problem:**")[1]?.split("**Solution:**")[0].trim() ?? "";
  const solution = text.split("**Solution:**")[1]?.split("**Final Answer:**")[0].trim() ?? "";
  const modelAnswer = text.split("**Final Answer:**")[1]?.trim() ?? "";

  return (
    <section className={styles.scientistQuestion} aria-labelledby={`${answerId}-title`} dir="rtl">
      <span className={styles.eyebrow}>🦂 فكر كعالم صغير! (Think like a scientist)</span>
      <h4 id={`${answerId}-title`} dir="ltr" style={{ textAlign: "left" }}>Problem Solving</h4>
      <ShortSourceText text={problem} />
      <label htmlFor={answerId}>ما رأيك؟ (What do you think?)</label>
      <textarea
        id={answerId}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="أعتقد أنه سيبحث في... لأن..."
      />
      <p className={styles.helper}>اكتب فكرتك أو قولها بصوت عالي، ثم قارنها بالإجابة!</p>
      <button
        className={styles.compareAnswer}
        onClick={() => setRevealed(!revealed)}
        aria-expanded={revealed}
        aria-controls={`${answerId}-answer`}
      >
        {revealed ? "إخفاء الإجابة النموذجية 🙈" : "إظهار الإجابة النموذجية 💡"}
      </button>
      <div id={`${answerId}-answer`} hidden={!revealed} className={styles.exampleAnswer}>
        <strong>💡 الإجابة النموذجية (Example Answer)</strong>
        <ShortSourceText text={modelAnswer} />
        <Reveal title="لماذا هذه الإجابة صحيحة؟ (Reasoning)" icon="🔍">
          <ShortSourceText text={solution} />
        </Reveal>
      </div>
    </section>
  );
}

interface DynamicCard {
  id: string;
  badge: string;
  heading: string;
  subTitle?: string;
  content: string;
  icon: string;
}

const DYNAMIC_ICONS = ["🔍", "🪲", "🌱", "💡", "📋", "🌿", "⭐", "🎯", "🧠", "✨", "🚀"];

function buildDynamicCards(sections: Section[]): DynamicCard[] {
  const cards: DynamicCard[] = [];

  sections.forEach((sec, sIdx) => {
    if (
      sec.heading.startsWith("6.") ||
      sec.heading.toLowerCase().includes("exercise") ||
      sec.heading.toLowerCase().includes("question")
    ) {
      return;
    }

    const icon = DYNAMIC_ICONS[sIdx % DYNAMIC_ICONS.length];
    const cleanHeading = sec.heading.replace(/^\d+\.\s*/, "").trim();

    const subBlocks = sec.body_md.split(/^### (.+)$/m);
    if (subBlocks.length > 1) {
      for (let i = 1; i < subBlocks.length; i += 2) {
        const subTitle = subBlocks[i].trim();
        const subBody = clean(subBlocks[i + 1]);
        if (!subBody) continue;

        const paragraphs = subBody.split(/\n\s*\n/).filter((p) => p.trim());
        paragraphs.forEach((para, pIdx) => {
          cards.push({
            id: `card-${sec.id}-${i}-${pIdx}`,
            badge: `مفهوم ${cards.length + 1} | CONCEPT ${cards.length + 1}`,
            heading: cleanHeading,
            subTitle,
            content: para,
            icon,
          });
        });
      }
    } else {
      const paragraphs = clean(sec.body_md).split(/\n\s*\n/).filter((p) => p.trim());
      paragraphs.forEach((para, pIdx) => {
        cards.push({
          id: `card-${sec.id}-${pIdx}`,
          badge: `بطاقة ${cards.length + 1} | STEP ${cards.length + 1}`,
          heading: cleanHeading,
          content: para,
          icon,
        });
      });
    }
  });

  return cards;
}

export function ScienceLearn({
  sections,
  lessonId,
  onCompletePractice,
  onProgress,
}: {
  sections: Section[];
  lessonId: number;
  onCompletePractice?: () => void;
  onProgress?: () => void;
}) {
  const [step, setStep] = useState(0);
  const { user, rewards, refresh } = useLearner();
  const [learned, setLearned] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isLesson2 = lessonId === 13 || sections.some((s) => s.body_md.includes("How to Observe"));
  const isDynamicLesson = !isLesson2 && (lessonId !== 12 || !sections.some((s) => s.body_md.includes("Living Organisms")));
  const dynamicCards = isDynamicLesson ? buildDynamicCards(sections) : [];

  const LESSON_2_TOTAL_CARDS = 6 + observationCards.length;
  const TOTAL_CARDS = isLesson2 ? LESSON_2_TOTAL_CARDS : isDynamicLesson ? Math.max(1, dynamicCards.length) : 20;

  const source = (number: number) =>
    sections.find((section) => section.heading.startsWith(`${number}.`))?.body_md ?? "";
  const concepts = blocks(source(3));
  const concept = (prefix: string) =>
    concepts.find((block) => block.title.startsWith(prefix))?.body ?? "";
  const vocabulary = blocks(source(4));
  const definition = (word: string) =>
    vocabulary
      .find((block) => block.title === word)
      ?.body.split("**Example / Context:**")[0]
      .replace("**Meaning:**", "")
      .trim() ?? "";
  const habitats = concept("Examples")
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1)
    .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean));
  const explore = concept("Process").split("\n").filter((line) => /^\d\./.test(line));
  const summary = blocks(source(8));

  async function restore() {
    setSaveError("");
    let localLearned: number[] = [];
    try {
      const raw = localStorage.getItem(`zakrely_learned_${user.id}_${lessonId}`);
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
    } catch {
      // Backend sync failed silently; local progress is already active
    }
  }

  useEffect(() => {
    void restore();
  }, [lessonId]);

  const headingRef = useRef<HTMLHeadingElement>(null);

  function go(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  function advance() {
    const newLearned = [...new Set([...learned, step])];
    setLearned(newLearned);

    try {
      localStorage.setItem(`zakrely_learned_${user.id}_${lessonId}`, JSON.stringify(newLearned));
    } catch {}

    if (step < TOTAL_CARDS - 1) {
      go(step + 1);
    } else {
      setStep(TOTAL_CARDS);
    }

    lessonsApi.saveActivity(lessonId, { learned_steps: newLearned, learning_total: TOTAL_CARDS })
      .then(() => { setSaveError(""); onProgress?.(); void refresh(); })
      .catch(() => setSaveError("تم الحفظ على هذا الجهاز. سنحاول مزامنة تقدمك عند فتح الدرس مرة أخرى."));
  }

  if (isLesson2) {
    const isFinished = step >= LESSON_2_TOTAL_CARDS;

    return (
      <div className={styles.learnContainer} dir="ltr" lang="en" aria-label="Explore Science Lesson 2">
        <header className={styles.duoHeader}>
          <div className={styles.headerLeft} dir="rtl">
            <span className={styles.duoBadge}>🌟 نقاط +{rewards?.points ?? 0}</span>
            <span className={styles.stepCount}>
              بطاقة {isFinished ? LESSON_2_TOTAL_CARDS : step + 1} من {LESSON_2_TOTAL_CARDS}
            </span>
          </div>
          <div
            className={styles.duoProgress}
            role="progressbar"
            aria-valuenow={isFinished ? LESSON_2_TOTAL_CARDS : step + 1}
            aria-valuemin={0}
            aria-valuemax={LESSON_2_TOTAL_CARDS}
          >
            <div
              className={styles.duoProgressBar}
              style={{ width: `${((isFinished ? LESSON_2_TOTAL_CARDS : step + 1) / LESSON_2_TOTAL_CARDS) * 100}%` }}
            />
          </div>
        </header>

        <main className={styles.duoViewport}>
          {/* Card 0: Welcome & Overview */}
          {step === 0 && (
            <div className={styles.duoCard} key="l2-c0">
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">🔍</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>أهلاً يا بطل! 🚀 LESSON 2</span>
                  <h3 ref={headingRef} tabIndex={-1}>How to Observe (كيف نلاحظ؟)</h3>
                  <small className="text-[#1e5c4a] font-bold block" dir="rtl">
                    هيا نكتشف سر الملاحظة ودراسة الكائنات الحية بالعدسة المكبرة! 🔎
                  </small>
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <div className="p-3.5 rounded-xl bg-[#edf3e7] border border-[#c4cebf] text-right space-y-2" dir="rtl">
                  <p className="font-bold text-sm text-[#292c32]">
                    في هذا الدرس السريع هنتعلم 3 حاجات مهمة جداً:
                  </p>
                  <ul className="text-xs sm:text-sm font-semibold text-[#1e5c4a] space-y-1.5 list-none pr-1">
                    <li>🔹 <strong className="text-[#527f76]">3 Rules for Observation:</strong> قواعد الملاحظة (الشكل، اللون، الحجم).</li>
                    <li>🔹 <strong className="text-[#527f76]">Magnifying Glass:</strong> استخدام العدسة المكبرة بحرفية ودقة.</li>
                    <li>🔹 <strong className="text-[#527f76]">Record Card:</strong> عمل كارت الملاحظة والرسم العلمي بدون تظليل.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Card 1: 3 Rules for Observation */}
          {step === 1 && (
            <div className={styles.duoCard} key="l2-c1">
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">🔎</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>📌 STEP 1 | الخطوة الأولى</span>
                  <h3 ref={headingRef} tabIndex={-1}>3 Rules for Observation</h3>
                  <small className="text-[#1e5c4a] font-bold block" dir="rtl">قواعد الملاحظة الدقيقة الثلاث</small>
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <p className="text-xs sm:text-sm text-[#292c32] font-semibold text-right mb-3" dir="rtl">
                  لما نلاحظ أي كائن حي، لازم نركز على <strong className="text-[#527f76]">3 صفات أساسية</strong>:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-[#edf3e7] border border-[#c4cebf]">
                    <span className="text-2xl block mb-1">🔷</span>
                    <strong className="block text-xs text-[#1e5c4a] font-black">Shape</strong>
                    <span className="text-xs text-[#536b62] font-bold" dir="rtl">الشكل</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f9eee7] border border-[#e5c9bc]">
                    <span className="text-2xl block mb-1">🎨</span>
                    <strong className="block text-xs text-[#774b48] font-black">Color</strong>
                    <span className="text-xs text-[#774b48] font-bold" dir="rtl">اللون</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#edf3e7] border border-[#c4cebf]">
                    <span className="text-2xl block mb-1">📏</span>
                    <strong className="block text-xs text-[#1e5c4a] font-black">Size</strong>
                    <span className="text-xs text-[#536b62] font-bold" dir="rtl">الحجم</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Magnifying Glass Usage */}
          {step === 2 && (
            <div className={styles.duoCard} key="l2-c2">
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">🔍</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>🔍 STEP 2 | الخطوة الثانية</span>
                  <h3 ref={headingRef} tabIndex={-1}>Magnifying Glass (العدسة المكبرة)</h3>
                  <small className="text-[#1e5c4a] font-bold block" dir="rtl">كيف نستخدم العدسة المكبرة صح؟</small>
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <div className="space-y-2 text-right text-xs sm:text-sm" dir="rtl">
                  <div className="p-3 rounded-xl bg-[#edf3e7] border border-[#c4cebf]">
                    <strong className="text-[#1e5c4a] block font-black text-xs mb-1">
                      🍃 1. Movable Object (شيء يمكن تحريكه مثل ورقة شجر):
                    </strong>
                    <p className="text-[#292c32] font-medium leading-relaxed">
                      قرّب العدسة المكبرة لعينك، وبعدين حرّك الشيء (الورقة) للأمام والخلف لحد ما الصورة توضح تماماً.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#d8ddd6]">
                    <strong className="text-[#527f76] block font-black text-xs mb-1">
                      🪵 2. Unmovable Object (شيء لا يمكن تحريكه مثل جذع شجرة):
                    </strong>
                    <p className="text-[#292c32] font-medium leading-relaxed">
                      قرّب العدسة لعينك، وحرّك <strong className="text-[#774b48]">وجهك والعدسة معاً</strong> للأمام والخلف للتركيز.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Record Card & Sketch */}
          {step === 3 && (
            <div className={styles.duoCard} key="l2-c3">
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">📋</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>📋 STEP 3 | الخطوة الثالثة</span>
                  <h3 ref={headingRef} tabIndex={-1}>Record Card (بطاقة التسجيل)</h3>
                  <small className="text-[#1e5c4a] font-bold block" dir="rtl">كيف نكتب كارت الملاحظة والرسم العلمي؟</small>
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <div className="p-3.5 rounded-xl bg-white border border-[#d8ddd6] text-right space-y-1.5 text-xs sm:text-sm" dir="rtl">
                  <p className="font-bold text-[#1e5c4a]">خطوات عمل بطاقة التسجيل (4 Steps):</p>
                  <ol className="list-decimal list-inside text-[#292c32] space-y-1 font-semibold">
                    <li><strong className="text-[#527f76]">Topic (الموضوع):</strong> نكتب العنوان أول حاجة.</li>
                    <li><strong className="text-[#527f76]">Date & Name:</strong> نكتب التاريخ والاسم والصف.</li>
                    <li><strong className="text-[#527f76]">Sketch + Sentences:</strong> رسم بخطوط رفيعة واضحة بدون تظليل، وجمل توضح Size, Color, Shape, و Location.</li>
                    <li><strong className="text-[#527f76]">What I learned / Questions:</strong> اكتب اللي اتعلمته أو الأسئلة اللي لسه عندك.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Practical Examples */}
          {step === 4 && (
            <div className={styles.duoCard} key="l2-c4">
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">🪲</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>🌟 STEP 4 | أمثلة تطبيقية</span>
                  <h3 ref={headingRef} tabIndex={-1}>Dung Beetle & Plant Leaf</h3>
                  <small className="text-[#1e5c4a] font-bold block" dir="rtl">مثال كارت الملاحظة لخنفساء الروث وورقة النبات</small>
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <div className="grid grid-cols-2 gap-2 text-right text-xs" dir="rtl">
                  <div className="p-3 rounded-xl bg-[#edf3e7] border border-[#c4cebf] space-y-1">
                    <strong className="text-[#1e5c4a] font-black block">🪲 Dung Beetle:</strong>
                    <p>📏 <strong>Size:</strong> About 2 cm</p>
                    <p>🎨 <strong>Color:</strong> Black (أسود)</p>
                    <p>🔷 <strong>Shape:</strong> Oval (بيضاوي)</p>
                    <p>📍 <strong>Location:</strong> Ground / Nile</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#d8ddd6] space-y-1">
                    <strong className="text-[#527f76] font-black block">🍃 Plant Leaf:</strong>
                    <p>📏 <strong>Size:</strong> About 6 cm</p>
                    <p>🎨 <strong>Color:</strong> Dark green</p>
                    <p>🔷 <strong>Shape:</strong> Oval</p>
                    <p>📍 <strong>Location:</strong> Tree branches</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 5: Safety Precautions */}
          {step === 5 && (
            <div className={styles.duoCard} key="l2-c5">
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">⚠️</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>⚠️ SAFETY | تحذيرات السلامة</span>
                  <h3 ref={headingRef} tabIndex={-1}>Safety Precautions (السلامة أولاً)</h3>
                  <small className="text-[#774b48] font-bold block" dir="rtl">تعليمات السلامة أثناء استخدام العدسة</small>
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <div className="space-y-2 text-right text-xs sm:text-sm" dir="rtl">
                  <div className="p-3 rounded-xl bg-[#f9eee7] border border-[#e5c9bc]">
                    <strong className="text-[#774b48] block font-black mb-1">
                      ☀️ 1. Never look directly at the Sun!
                    </strong>
                    <p className="text-[#292c32] font-semibold">
                      لا تنظر أبداً للشمس مباشرة عبر العدسة المكبرة لأنها تؤذي عينيك الجميلتين!
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#edf3e7] border border-[#c4cebf]">
                    <strong className="text-[#1e5c4a] block font-black mb-1">
                      🧤 2. Wear Gloves!
                    </strong>
                    <p className="text-[#292c32] font-semibold">
                      ارتدِ القفازات أثناء ملاحظة الكائنات الحية لحماية يديك من التلوث.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step >= 6 && !isFinished && <ScienceObservationCard key={`l2-memory-${step}`} index={step - 6} />}

          {/* Celebration / Finished Card */}
          {isFinished && (
            <div className={styles.duoCelebrationCard} dir="rtl">
              <span className={styles.celebrationIcon} aria-hidden="true">🎉 🌟 🎯</span>
              <h3 className="text-xl font-black text-[#292c32] mb-1">ممتاز يا بطل! أتممت الدرس الثاني!</h3>
              <p className="text-xs text-[#536b62] font-semibold mb-4">
                أنت الآن جاهز لبدء الأسئلة والتدريبات التفاعلية لهذا الدرس.
              </p>
            </div>
          )}
        </main>

        <footer className={styles.duoFooter} dir="rtl">
          {!isFinished ? (
            <button type="button" className={styles.duoBtnNext} onClick={advance}>
              التالي ←
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.duoBtnNext} ${styles.duoBtnComplete}`}
              onClick={onCompletePractice}
            >
              ابدأ التدريبات الآن! ✍️
            </button>
          )}
          <button
            type="button"
            className={styles.duoBtnBack}
            disabled={step === 0}
            onClick={() => go(step - 1)}
          >
            السابق →
          </button>
        </footer>
      </div>
    );
  }

  if (isDynamicLesson) {
    const currentCard = dynamicCards[step];
    const isFinished = step >= TOTAL_CARDS;

    return (
      <div className={styles.learnContainer} dir="ltr" lang="en" aria-label="Explore Science Lesson">
        {/* Duolingo Arabic Header Bar */}
        <header className={styles.duoHeader}>
          <div className={styles.headerLeft} dir="rtl">
            <span className={styles.duoBadge}>🌟 نقاط +{rewards?.points ?? 0}</span>
            <span className={styles.stepCount}>
              بطاقة {isFinished ? TOTAL_CARDS : step + 1} من {TOTAL_CARDS}
            </span>
          </div>
          <div
            className={styles.duoProgress}
            role="progressbar"
            aria-valuenow={isFinished ? TOTAL_CARDS : step + 1}
            aria-valuemin={0}
            aria-valuemax={TOTAL_CARDS}
          >
            <div
              className={styles.duoProgressBar}
              style={{ width: `${((isFinished ? TOTAL_CARDS : step + 1) / TOTAL_CARDS) * 100}%` }}
            />
          </div>
        </header>

        {/* Viewport Frame - Zero Scrolling & Short Micro-Cards */}
        <main className={styles.duoViewport}>
          {!isFinished && currentCard ? (
            <div className={styles.duoCard} key={currentCard.id}>
              <div className={styles.mascotRow}>
                <span className={styles.duoHeroIcon} aria-hidden="true">{currentCard.icon}</span>
                <div className={styles.mascotBubble}>
                  <span className={styles.cardBadge}>{currentCard.badge}</span>
                  <h3 ref={headingRef} tabIndex={-1}>{currentCard.heading}</h3>
                  {currentCard.subTitle && (
                    <small className="text-emerald-700 font-semibold block" dir="auto">{currentCard.subTitle}</small>
                  )}
                </div>
              </div>
              <div className={styles.cardContentBody}>
                <ShortSourceText text={currentCard.content} />
              </div>
            </div>
          ) : (
            <div className={styles.duoCelebrationCard} dir="rtl">
              <span className={styles.celebrationIcon} aria-hidden="true">🎉 🌟 🎯</span>
              <h3>ماشاء الله! أتممت الشرح بالكامل!</h3>
              <p>أنت الآن جاهز تماماً لبدء التدريبات واختبار فهمك لهذا الدرس.</p>
            </div>
          )}
        </main>

        {/* Duolingo Arabic Action Footer */}
        <footer className={styles.duoFooter} dir="rtl">
          {!isFinished ? (
            <button
              type="button"
              className={styles.duoBtnNext}
              onClick={advance}
            >
              التالي ←
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.duoBtnNext} ${styles.duoBtnComplete}`}
              onClick={onCompletePractice}
            >
              ابدأ التدريبات الآن! ✍️
            </button>
          )}
          <button
            type="button"
            className={styles.duoBtnBack}
            disabled={step === 0}
            onClick={() => go(step - 1)}
          >
            السابق →
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className={styles.learnContainer} dir="ltr" lang="en" aria-label="Explore Science Lesson 1">
      {/* Duolingo Arabic Header Bar */}
      <header className={styles.duoHeader}>
        <div className={styles.headerLeft} dir="rtl">
          <span className={styles.duoBadge}>🌟 نقاط +{rewards?.points ?? 0}</span>
          <span className={styles.stepCount}>
            بطاقة {step >= TOTAL_CARDS ? TOTAL_CARDS : step + 1} من {TOTAL_CARDS}
          </span>
        </div>
        <div
          className={styles.duoProgress}
          role="progressbar"
          aria-valuenow={step >= TOTAL_CARDS ? TOTAL_CARDS : step + 1}
          aria-valuemin={0}
          aria-valuemax={TOTAL_CARDS}
        >
          <div
            className={styles.duoProgressBar}
            style={{ width: `${((step >= TOTAL_CARDS ? TOTAL_CARDS : step + 1) / TOTAL_CARDS) * 100}%` }}
          />
        </div>
      </header>

      {/* Viewport Frame - Zero Scrolling & Short Micro-Cards */}
      <main className={styles.duoViewport}>
        {/* Card 0: Welcome & Overview */}
        {step === 0 && (
          <div className={styles.duoCard} key="c0">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🌱</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>أهلاً يا بطل! 🚀 LESSON 1</span>
                <h3 ref={headingRef} tabIndex={-1}>Let's Find Living Organisms</h3>
                <small className="text-emerald-700 font-semibold" dir="rtl">هيا نكتشف الكائنات الحية حولنا!</small>
              </div>
            </div>
            <div className={styles.cardContentBody}>
              <p dir="rtl" className="text-sm font-bold text-slate-700">في هذا الدرس سنتعلم الفرق بين الكائن الحي والجماد، وأين يعيش كل كائن حي (الموئل).</p>
              <ShortSourceText text="Lesson 1 introduces living organisms vs non-living things, their 3 main needs (feeding, growth, breathing), and their habitats." />
            </div>
          </div>
        )}

        {/* Card 1: Learning Objectives */}
        {step === 1 && (
          <div className={styles.duoCard} key="c1">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🎯</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>أهداف الدرس | OBJECTIVES</span>
                <h3 ref={headingRef} tabIndex={-1}>What You Will Learn</h3>
              </div>
            </div>
            <div className={styles.cardContentBody}>
              <ShortSourceText text={source(2)} />
            </div>
          </div>
        )}

        {/* Card 2: Living vs Non-Living */}
        {step === 2 && (
          <div className={styles.duoCard} key="c2">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🌳</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>مفهوم أساسي | CONCEPT</span>
                <h3 ref={headingRef} tabIndex={-1}>Living vs Non-Living</h3>
              </div>
            </div>
            <div className={styles.compare}>
              {["Living organisms", "Non-living things"].map((word, i) => (
                <article key={word} className={i === 0 ? styles.living : styles.nonliving}>
                  <span className={styles.bigEmoji} aria-hidden="true">{i === 0 ? "🌳 🐇" : "🪨 💧"}</span>
                  <h4>{word}</h4>
                  <small className="block text-xs font-extrabold mb-1" dir="rtl">{arabicLabels[word]}</small>
                  <p>{definition(word)}</p>
                  <span className={styles.pill}>{i === 0 ? "Feed · Grow · Breathe" : "No feeding · No growth · No breathing"}</span>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Card 3: Three Clues to Life */}
        {step === 3 && (
          <div className={styles.duoCard} key="c3">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">💡</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>الأدلة الثلاثة | 3 CLUES</span>
                <h3 ref={headingRef} tabIndex={-1}>Three Clues to Life</h3>
              </div>
            </div>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">💡</span>
              <div>
                <strong>الصفات الثلاث للحياة:</strong>
                <p>1. التغذية (Feeding) + 2. النمو (Growth) + 3. التنفس (Breathing)</p>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Clue 1 - Feeding */}
        {step === 4 && (
          <div className={styles.duoCard} key="c4">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🥕</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>1. التغذية | FEEDING</span>
                <h3 ref={headingRef} tabIndex={-1}>Feeding</h3>
              </div>
            </div>
            <div className={styles.cardContentBody}>
              <ShortSourceText text={vocabulary.find((block) => block.title === "Feeding")?.body ?? ""} />
            </div>
          </div>
        )}

        {/* Card 5: Clue 2 - Growth */}
        {step === 5 && (
          <div className={styles.duoCard} key="c5">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🌱</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>2. النمو | GROWTH</span>
                <h3 ref={headingRef} tabIndex={-1}>Growth</h3>
              </div>
            </div>
            <div className={styles.cardContentBody}>
              <ShortSourceText text={vocabulary.find((block) => block.title === "Growth")?.body ?? ""} />
            </div>
          </div>
        )}

        {/* Card 6: Clue 3 - Breathing */}
        {step === 6 && (
          <div className={styles.duoCard} key="c6">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🌬️</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>3. التنفس | BREATHING</span>
                <h3 ref={headingRef} tabIndex={-1}>Breathing</h3>
              </div>
            </div>
            <div className={styles.cardContentBody}>
              <ShortSourceText text={vocabulary.find((block) => block.title === "Breathing")?.body ?? ""} />
            </div>
          </div>
        )}

        {/* Card 7: Life Choice Quiz */}
        {step === 7 && (
          <div className={styles.duoCard} key="c7">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🎮</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>اختبر نفسك! | MINI GAME</span>
                <h3 ref={headingRef} tabIndex={-1}>Spot the Living Organism</h3>
              </div>
            </div>
            <LifeChoice />
          </div>
        )}

        {/* Card 8: Look Closer (Visual Concept) */}
        {step === 8 && (
          <div className={styles.duoCard} key="c8">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🧠</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>معلومة مهمة | CONCEPTS</span>
                <h3 ref={headingRef} tabIndex={-1}>Look a Little Closer</h3>
              </div>
            </div>
            <div className={styles.compare}>
              <div className="bg-[#edf3e7] border-2 border-[#c4cebf] border-b-4 border-b-[#a9c0ad] rounded-2xl p-3 text-center">
                <span className="text-3xl block mb-1">🌱 🐇 🌳</span>
                <h4 className="font-extrabold text-[#1e5c4a] text-sm">Living Organisms</h4>
                <small className="block text-xs font-bold text-[#527f76]" dir="rtl">الكائنات الحية</small>
                <p className="text-xs text-[#292c32] mt-1 font-medium">Humans, Animals, Plants</p>
              </div>
              <div className="bg-[#f0ece5] border-2 border-[#e1dbd0] border-b-4 border-b-[#d5cfc4] rounded-2xl p-3 text-center">
                <span className="text-3xl block mb-1">🌬️ 💧 🪨</span>
                <h4 className="font-extrabold text-[#6b2a28] text-sm">Non-Living Things</h4>
                <small className="block text-xs font-bold text-[#8b3a38]" dir="rtl">الجمادات والأشياء غير الحية</small>
                <p className="text-xs text-[#292c32] mt-1 font-medium">Air, Water, Rocks</p>
              </div>
            </div>
            <div className={styles.idea} dir="rtl">
              <span aria-hidden="true">✨</span>
              <div>
                <strong>السر الكبير للحياة:</strong>
                <p>تختلف الكائنات الحية عن الجمادات لأنها تقوم بالتغذية والنمو والتنفس!</p>
              </div>
            </div>
          </div>
        )}

        {/* Card 9: Habitat Intro (Super Memorable Interactive Card) */}
        {step === 9 && (
          <div className={styles.duoCard} key="c9">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🏡</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>ما هو الموئل؟ | WHAT IS A HABITAT?</span>
                <h3 ref={headingRef} tabIndex={-1}>Every Organism Needs a Home</h3>
              </div>
            </div>
            <div className="bg-[#edf3e7] border-2 border-[#c4cebf] border-b-4 border-b-[#527f76] rounded-2xl p-4 text-center">
              <span className="text-4xl block mb-2">🏡 🌳 💧 🛖</span>
              <h4 className="text-lg font-black text-[#1e5c4a] mb-1">Habitat = The Place Where an Organism Lives</h4>
              <p dir="rtl" className="text-sm font-bold text-[#527f76] mb-3">الموئل هو بيئة الكائن الحي التي توفر له احتياجاته 3:</p>
              <div className="grid grid-cols-3 gap-2" dir="rtl">
                <div className="bg-white border-2 border-[#c4cebf] rounded-xl p-2 text-center shadow-xs">
                  <span className="text-xl block mb-1">🥕</span>
                  <strong className="block text-xs text-[#292c32]">Food (طعام)</strong>
                  <span className="text-[10px] text-[#737c77]">للطاقة والنمو</span>
                </div>
                <div className="bg-white border-2 border-[#c4cebf] rounded-xl p-2 text-center shadow-xs">
                  <span className="text-xl block mb-1">💧</span>
                  <strong className="block text-xs text-[#292c32]">Water (ماء)</strong>
                  <span className="text-[10px] text-[#737c77]">للبقاء حياً</span>
                </div>
                <div className="bg-white border-2 border-[#ebdcc0] rounded-xl p-2 text-center shadow-xs">
                  <span className="text-xl block mb-1">🛖</span>
                  <strong className="block text-xs text-[#78350f]">Shelter (مأوى)</strong>
                  <span className="text-[10px] text-[#737c77]">للحماية والأمان</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 10: Who's Hiding Where */}
        {step === 10 && (
          <div className={styles.duoCard} key="c10">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🔍</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>أين تختبئ الكائنات؟ | HABITATS TABLE</span>
                <h3 ref={headingRef} tabIndex={-1}>Who's Hiding Where?</h3>
              </div>
            </div>
            <p className={styles.helper} dir="rtl">اضغط على اسم الكائن الحي لاكتشاف موئله (مكان معيشته):</p>
            <div className={styles.habitats}>
              {habitats.map(([organism, habitat]) => (
                <Reveal key={organism} title={organism} icon={icons[organism]}>
                  <p><strong>Habitat:</strong> {habitat}</p>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* Card 11: Scientific Facts (Visual Facts Cards) */}
        {step === 11 && (
          <div className={styles.duoCard} key="c11">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🔬</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>حقائق علمية | SCIENTIFIC FACTS</span>
                <h3 ref={headingRef} tabIndex={-1}>Habitats Are Different</h3>
              </div>
            </div>
            <div className="space-y-2" dir="rtl">
              <div className="bg-[#edf3e7] border-2 border-[#c4cebf] rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">🌿</span>
                <div>
                  <strong className="block text-xs text-[#1e5c4a] font-extrabold">تختلف الكائنات بحسب موئلها</strong>
                  <span className="text-[11px] text-[#527f76]">كل كائن يعيش في بيئة تلبي احتياجاته من طعام وماء ومأوى.</span>
                </div>
              </div>
              <div className="bg-[#f0ece5] border-2 border-[#e1dbd0] rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">🚫</span>
                <div>
                  <strong className="block text-xs text-[#292c32] font-extrabold">لا تعيش الكائنات كلها في نفس المكان</strong>
                  <span className="text-[11px] text-[#627164]">كل كائن حي يبحث عن البيئة والمكان الذي يناسب صفاته.</span>
                </div>
              </div>
              <div className="bg-[#faf0dc] border-2 border-[#ebdcc0] rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">🪨</span>
                <div>
                  <strong className="block text-xs text-[#78350f] font-extrabold">أماكن تواجد الكائنات الحية</strong>
                  <span className="text-[11px] text-[#8a5822]">تتواجد قرب الأعشاب والأشجار، أو تحت الصخور، وفي ظلال الأحجار.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 12: Habitat Places (Trees vs Stones Visual Comparison) */}
        {step === 12 && (
          <div className={styles.duoCard} key="c12">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🌳</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>أماكن المعيشة | HABITAT PLACES</span>
                <h3 ref={headingRef} tabIndex={-1}>Trees vs Under Stones</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2" dir="rtl">
              <div className="bg-[#edf3e7] border-2 border-[#c4cebf] rounded-xl p-3">
                <span className="text-2xl block mb-1">🌳 🐦</span>
                <strong className="block text-xs text-[#1e5c4a] font-extrabold">1. قرب الأعشاب والأشجار</strong>
                <p className="text-[10px] text-[#527f76] mt-1">تتميز بوجود الطعام وسهولة الاختباء!</p>
                <span className="inline-block mt-2 bg-white px-2 py-1 rounded-md text-[10px] font-bold text-[#1e5c4a] border border-[#c4cebf]">🐦 العصافير & 🦗 الجراد</span>
              </div>
              <div className="bg-[#f0ece5] border-2 border-[#e1dbd0] rounded-xl p-3">
                <span className="text-2xl block mb-1">🪨 🐜</span>
                <strong className="block text-xs text-[#292c32] font-extrabold">2. تحت الحجارة وفي الظل</strong>
                <p className="text-[10px] text-[#627164] mt-1">أماكن رطبة (فيها ماء) وباردة بعيداً عن الشمس!</p>
                <span className="inline-block mt-2 bg-white px-2 py-1 rounded-md text-[10px] font-bold text-[#292c32] border border-[#e1dbd0]">🐜 النمل & 🦎 السحالي</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 13: Environment & Desert (Bilingual Cause & Effect Card) */}
        {step === 13 && (
          <div className={styles.duoCard} key="c13">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">☀️</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>البيئة والصحراء | DESERT ADAPTATION</span>
                <h3 ref={headingRef} tabIndex={-1}>Living in Hot Deserts</h3>
              </div>
            </div>
            <div className="bg-[#faf0dc] border-2 border-[#ebdcc0] border-b-4 border-b-[#d4813a] rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3 bg-white border border-[#ebdcc0] rounded-xl p-3 shadow-xs" dir="rtl">
                <span className="text-3xl">☀️</span>
                <div>
                  <strong className="block text-xs text-[#78350f] font-black">السبب (Cause):</strong>
                  <p className="text-xs text-[#292c32] font-bold" dir="ltr">The desert Sun is intense during the day.</p>
                  <p className="text-[11px] text-[#8a5822] mt-1">شمس الصحراء حارة شديدة ومحرقة أثناء النهار.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white border border-[#c4cebf] rounded-xl p-3 shadow-xs" dir="rtl">
                <span className="text-3xl">🦎</span>
                <div>
                  <strong className="block text-xs text-[#1e5c4a] font-black">النتيجة (Effect):</strong>
                  <p className="text-xs text-[#292c32] font-bold" dir="ltr">Living organisms live under the ground or in the shade of rocks to avoid the heat.</p>
                  <p className="text-[11px] text-[#527f76] mt-1">تعيش الكائنات الحية تحت الأرض أو في ظل الصخور لتجنب حرارة الشمس.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 14: Environment Definition */}
        {step === 14 && (
          <div className={styles.duoCard} key="c14">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🌍</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>تعريف البيئة | ENVIRONMENT DEFINITION</span>
                <h3 ref={headingRef} tabIndex={-1}>Environment</h3>
              </div>
            </div>
            <div className="bg-[#edf3e7] border-2 border-[#c4cebf] border-b-4 border-b-[#527f76] rounded-2xl p-4 text-center">
              <span className="text-4xl block mb-2">🌍 🌿 🪨 🐇</span>
              <h4 className="text-base font-extrabold text-[#1e5c4a]">Environment (البيئة)</h4>
              <p className="text-xs text-[#292c32] mt-2 leading-relaxed font-medium" dir="rtl">كل ما يحيط بالكائن الحي من كائنات حية وأشياء غير حية (جمادات).</p>
            </div>
          </div>
        )}

        {/* Card 15: 3 Exploration Steps */}
        {step === 15 && (
          <div className={styles.duoCard} key="c15">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🧭</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>خطوات الاستكشاف الثلاث | DISCOVERY STEPS</span>
                <h3 ref={headingRef} tabIndex={-1}>Guess → Search → Record</h3>
              </div>
            </div>
            <div className={styles.exploreSteps}>
              {explore.map((line, index) => {
                const match = line.match(/^\d\. \*\*(.+?):\*\*\s*(.*)/);
                const arSteps = ["خَمِّن (Guess)", "ابحث (Search)", "سَجِّل (Record)"];
                return (
                  <Reveal
                    key={index}
                    title={`${index + 1}. ${arSteps[index]} — ${match?.[1] ?? ""}`}
                    icon={["🤔", "🔍", "✏️"][index]}
                  >
                    <ShortSourceText text={match?.[2] ?? line} />
                  </Reveal>
                );
              })}
            </div>
          </div>
        )}

        {/* Card 16: Explorer Safety Note */}
        {step === 16 && (
          <div className={styles.duoCard} key="c16">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🖐️</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>نصيحة الأمان | SAFETY RULE</span>
                <h3 ref={headingRef} tabIndex={-1}>Little Explorer, Stay Safe!</h3>
              </div>
            </div>
            <article className={styles.safety} dir="rtl">
              <span aria-hidden="true">🖐️</span>
              <div>
                <h4 className="text-amber-800">تنبيه هام للأبطال:</h4>
                <ShortSourceText text={concept("Important Notes")} />
              </div>
            </article>
          </div>
        )}

        {/* Card 17: Scientist Question */}
        {step === 17 && (
          <div className={styles.duoCard} key="c17">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">🦂</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>تفكير العلماء | PROBLEM SOLVING</span>
                <h3 ref={headingRef} tabIndex={-1}>Think Like a Scientist</h3>
              </div>
            </div>
            {blocks(source(7)).map((block) => (
              <ScientistQuestion key={block.title} text={block.body} />
            ))}
          </div>
        )}

        {/* Card 18: Vocabulary Lab */}
        {step === 18 && (
          <div className={styles.duoCard} key="c18">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">💬</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>معمل الكلمات | WORD LAB</span>
                <h3 ref={headingRef} tabIndex={-1}>Key Vocabulary</h3>
              </div>
            </div>
            <div className={styles.wordGrid}>
              {vocabulary.map((word) => (
                <Reveal
                  key={word.title}
                  title={`${word.title} ${arabicLabels[word.title] ? `(${arabicLabels[word.title]})` : ""}`}
                  icon={icons[word.title] ?? "💬"}
                >
                  <ShortSourceText text={word.body} />
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* Card 19: What to Remember & Summary */}
        {step === 19 && (
          <div className={styles.duoCard} key="c19">
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">✨</span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>ملخص الدرس | SUMMARY</span>
                <h3 ref={headingRef} tabIndex={-1}>What You Discovered!</h3>
              </div>
            </div>
            <article className={styles.conceptCard}>
              <span className={styles.bigEmoji} aria-hidden="true">🌱 🏡 🔍</span>
              <h4 dir="rtl">أهم ما يجب تذكره في الدرس:</h4>
              <ShortSourceText text={summary.find((block) => block.title === "What Students Should Remember")?.body ?? ""} />
            </article>
          </div>
        )}

        {/* Completion Screen */}
        {step >= TOTAL_CARDS && (
          <div className={styles.duoCelebrationCard} dir="rtl">
            <span className={styles.celebrationIcon} aria-hidden="true">🌟 🏆 🚀</span>
            <h3>ماشاء الله! أتممت قراءة شرح الدرس بنجاح!</h3>
            <p>تعلمت الكائنات الحية والجمادات والموئل وكيف تفكر كعالم صغير. أنت الآن جاهز للتمارين!</p>
          </div>
        )}
      </main>

      {/* Save error notice */}
      {saveError && <p className={styles.progressNote} role="alert">{saveError}</p>}

      {/* Duolingo Action Footer in Arabic */}
      <footer className={styles.duoFooter} dir="rtl">
        {step < TOTAL_CARDS ? (
          <button
            type="button"
            className={styles.duoBtnNext}
            disabled={saving}
            onClick={() => void advance()}
          >
            {saving ? "جاري الحفظ…" : "التالي ←"}
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.duoBtnNext} ${styles.duoBtnComplete}`}
            onClick={onCompletePractice}
          >
            ابدأ التدريبات الآن! ✍️
          </button>
        )}
        <button
          type="button"
          className={styles.duoBtnBack}
          disabled={step === 0 || saving}
          onClick={() => go(step - 1)}
        >
          السابق →
        </button>
      </footer>
    </div>
  );
}
