"use client";

import styles from "./ScienceLearn.module.css";

// Short learning reminders from Science Unit 1 Lesson 2: How to Observe.
export const observationCards = [
  {
    icon: "👀", title: "Look for three clues", arabic: "لاحظ ٣ حاجات",
    lines: [
      ["🔷 Shape → What shape is it?", "الشكل: شكله إيه؟ مثال: بيضاوي."],
      ["🎨 Color → What color is it?", "اللون: لونه إيه؟ مثال: أخضر غامق."],
      ["📏 Size → How big is it?", "الحجم: حجمه قد إيه؟ مثال: حوالي ٦ سم."],
    ],
    memory: "Shape · Color · Size — شكل · لون · حجم",
    prompt: "هل المكان (Location) هو الحجم (Size)؟",
    answer: "لا! Size يعني الحجم، وLocation يعني المكان اللي لقيت فيه الكائن. بنكتب الاتنين في بطاقة التسجيل.",
  },
  {
    icon: "🔎", title: "What should I move?", arabic: "أحرّك إيه عشان أشوف بوضوح؟",
    lines: [
      ["Small leaf → move the leaf back and front.", "ورقة صغيرة ممكن تتحرك: قرّب العدسة من عينك، وحرّك الورقة للأمام والخلف."],
      ["Tree trunk → move your face and the glass together.", "جذع شجرة مش هيتحرك: قرّب العدسة من عينك، وحرّك وجهك والعدسة مع بعض للأمام والخلف."],
    ],
    memory: "Can move? Move the object. Cannot move? Face + glass together.",
    prompt: "بتلاحظ جذع شجرة: تحرّك الجذع ولا وجهك والعدسة؟",
    answer: "وجهك والعدسة مع بعض، للأمام والخلف، لحد ما الصورة تبقى واضحة.",
  },
  {
    icon: "✏️", title: "Draw like a scientist", arabic: "رسم بسيط وواضح",
    lines: [
      ["Thin, clear lines. No shading.", "ارسم بخطوط رفيعة وواضحة، من غير تظليل."],
      ["Add sentences: size, color, shape, location.", "جنب الرسم، اكتب جمل عن الحجم واللون والشكل والمكان."],
    ],
    memory: "Sketch + sentences — رسم + جمل وصفية",
    prompt: "رسمت الكائن بس، كده التسجيل كامل؟",
    answer: "لسه! ضيف جمل تصف حجمه ولونه وشكله، والمكان اللي لقيته فيه.",
  },
  {
    icon: "🪲", title: "Notice the tiny details", arabic: "العدسة بتساعدك تشوف التفاصيل",
    lines: [
      ["Dung beetle → small hairs and leg joints.", "خنفساء الروث: لاحظ الشعيرات الصغيرة ومفاصل الأرجل. حجمها في المثال حوالي ٢ سم، ولونها أسود."],
      ["Plant leaf → a long central vein and smaller veins.", "ورقة النبات: عرق طويل في المنتصف وعروق أصغر متفرعة على الجانبين. حجمها في المثال حوالي ٦ سم، ولونها أخضر غامق."],
    ],
    memory: "Beetle → hairs & joints. Leaf → veins.",
    prompt: "إيه التفاصيل اللي تدور عليها في ورقة النبات؟",
    answer: "العروق! عرق طويل واضح في المنتصف، وعروق أصغر متفرعة منه على الجانبين.",
  },
  {
    icon: "📋", title: "Remember the record-card order", arabic: "بطاقة التسجيل في ٤ خطوات",
    lines: [
      ["1. Topic", "اكتب الموضوع أول حاجة."],
      ["2. Date · Grade · Name", "اكتب التاريخ والصف واسمك."],
      ["3. Sketch + descriptive sentences", "ارسم بخطوط رفيعة واضحة من غير تظليل، واكتب الحجم واللون والشكل والمكان."],
      ["4. What I learned / my questions", "اكتب اللي اتعلمته أو الأسئلة اللي لسه بتفكر فيها."],
    ],
    memory: "Topic → My details → My observation → What I learned",
    prompt: "إيه أول حاجة وآخر حاجة في بطاقة التسجيل؟",
    answer: "أول حاجة: الموضوع. آخر حاجة: اللي اتعلمته أو الأسئلة اللي لسه عندك.",
  },
];

export function ScienceObservationCard({ index }: { index: number }) {
  const card = observationCards[index];
  if (!card) return null;
  return <div className={styles.duoCard}>
    <div className={styles.mascotRow}>
      <span className={styles.duoHeroIcon} aria-hidden="true">{card.icon}</span>
      <div className={styles.mascotBubble}>
        <span className={styles.cardBadge}>🧠 LESSON 2 · شرح وتذكّر</span>
        <h3>{card.title}</h3>
        <p dir="rtl" className="text-sm font-bold text-[#1e5c4a]">{card.arabic}</p>
      </div>
    </div>
    <div className={styles.cardContentBody}>
      <div className="space-y-3">{card.lines.map(([english, arabic]) => <article key={english} className="rounded-xl border border-[#c4cebf] bg-[#edf3e7] p-3 text-sm leading-7">
        <p className="font-bold text-[#1e5c4a]">{english}</p>
        <p dir="rtl">{arabic}</p>
      </article>)}</div>
      <p className="my-3 rounded-xl bg-[#f7ecd7] p-3 text-sm font-bold leading-7">💡 {card.memory}</p>
      <details className={styles.reveal} dir="rtl">
        <summary className="cursor-pointer p-3 font-bold">👆 افتكر بنفسك: {card.prompt}</summary>
        <p className="p-3 text-sm leading-7">{card.answer}</p>
      </details>
    </div>
  </div>;
}
