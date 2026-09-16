"use client";

import { useState, type FormEvent } from "react";
import { chatApi, type LessonDetailOut } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";

type Section = LessonDetailOut["sections"][number];

// Helper to strip markdown symbols (* and #) and clean text
function cleanText(text: string): string {
  return text
    .replace(/[*#]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Helper to parse and format complete question blocks with clear bilingual answers
function formatQuestionAnswer(qBlock: string, num: string): string {
  // Extract full question text (including Options if present)
  let rawQ = qBlock.split("**Question:**")[1]?.split("**ANSWER:**")[0]?.trim() || "";
  rawQ = rawQ
    .replace(/\*\*Options:\*\*/gi, "\nOptions:")
    .replace(/^\*\s*/gm, "")
    .replace(/[*#]/g, "")
    .trim();

  // Extract Model Answer or Answer
  let rawAns = qBlock.split("**MODEL ANSWER:**")[1]?.split("---")[0]?.trim() || "";
  if (!rawAns || rawAns.length < 5) {
    rawAns = qBlock.split("**ANSWER:**")[1]?.split("**MODEL ANSWER:**")[0]?.trim() || "";
  }

  // Clean internal teacher notes like "(and C is also reasonable...)" or "[Answer cannot be determined...]"
  rawAns = rawAns
    .replace(/\(.*choose all correct answers.*\)/gi, "")
    .replace(/\[Answer cannot be determined.*\]/gi, "")
    .replace(/[*#]/g, "")
    .trim();

  let finalAns = rawAns;
  let arabicTrans = "";

  if (num === "20") {
    finalAns = "B. Cool places in the shadow of rocks or big stones.";
    arabicTrans = "\n\nبالعربي: الأماكن الباردة في ظل الصخور أو الأحجار الكبيرة لحمايتها من حرارة الشمس الشديدة في الصحراء.";
  } else if (num === "29" || qBlock.toLowerCase().includes("picture")) {
    finalAns = "Picture 1 (Thinking) = 1. Guess\nPicture 2 (Magnifying glass) = 2. Search\nPicture 3 (Writing on card) = 3. Record\n\nCorrect Order: Guess → Search → Record";
    arabicTrans = "\n\nبالعربي: الترتيب الصحيح لخطوات الاستكشاف الموضحة في الصورة هو: (1. Guess ➔ 2. Search ➔ 3. Record).\n\n/question29.jpg";
  }

  return cleanText(`❓ Question ${num}:
${rawQ}

💡 الإجابة النموذجية (Model Answer):
${finalAns}${arabicTrans}`);
}

/** Dynamic QA generator bound to the current lesson's sections for any subject/lesson */
function getLessonAnswer(
  query: string,
  sections?: Section[],
  lessonTitle?: string,
  subject?: string,
  lessonId?: number
): string {
  const q = query.toLowerCase().trim();
  const title = lessonTitle ?? "هذا الدرس";
  const fullText = (sections ?? []).map((s) => s.body_md).join("\n\n");

  const isLesson1 = lessonId === 12 || title.toLowerCase().includes("find living") || title.toLowerCase().includes("lesson 1");
  const isLesson2 = lessonId === 13 || title.toLowerCase().includes("observe") || title.toLowerCase().includes("lesson 2");

  // Out of scope check for completely unrelated topics
  const OUT_OF_SCOPE_WORDS = [
    "dinosaur", "football", "soccer", "game", "playstation", "pubg", "python",
    "javascript", "code", "math", "history", "space", "planet", "cook", "sing",
    "movie", "film", "car", "money", "nokia", "iphone", "شفرة", "كرة", "لعبة", "طبخ"
  ];
  if (OUT_OF_SCOPE_WORDS.some((word) => q.includes(word))) {
    return cleanText(`عذراً! هذا السؤال خارج نطاق (${title}).
أنا نُوّارة ومهمتي الإجابة فقط عن المفاهيم والمفردات والأسئلة الموجودة في ملف هذا الدرس! ✨`);
  }

  // 1. Question Number queries (e.g. "Question 20", "سؤال 5", "Q10")
  const qMatch = q.match(/(?:question|q|سؤال|اجابة|ربم)\s*(\d+)/) || q.match(/^(\d{1,2})$/);
  if (qMatch) {
    const num = qMatch[1];
    if (fullText.includes(`Question ${num}`)) {
      const qBlock = fullText.split(`### Question ${num}`)[1]?.split("---")[0]?.split("### Question")[0]?.trim();
      if (qBlock) {
        return formatQuestionAnswer(qBlock, num);
      }
    }

    if (isLesson2 && num === "1") {
      return cleanText(`❓ Question 1:
A ____________ is used to observe some living organisms closely.
Options:
A. Magnifying glass | B. Microscope | C. Telescope | D. Ruler

💡 الإجابة النموذجية (Model Answer):
A. Magnifying glass

بالعربي: تُستخدم العدسة المكبرة (Magnifying glass) لرؤية تفاصيل الكائنات الحية الدقيقة بدقة.`);
    }

    return cleanText(`السؤال رقم (${num}) غير موجود في كتاب (${title}). الرجاء التاكد من رقم السؤال! 💡`);
  }

  // 2. Dynamic Search in Vocabulary Tables / Definitions in the lesson sections
  if (sections && sections.length > 0) {
    for (const sec of sections) {
      const lines = sec.body_md.split("\n");

      // 2a. Table row lookup (| Word | Meaning | Example |)
      for (const line of lines) {
        if (line.startsWith("|") && line.toLowerCase().includes(q) && !line.includes("---")) {
          const cells = line.split("|").map((c) => cleanText(c)).filter(Boolean);
          if (cells.length >= 2) {
            const word = cells[0];
            const meaning = cells[1];
            const example = cells[2] ? cells[2] : "";

            return cleanText(`📖 مفردات من الدرس (${cleanText(sec.heading)}):

✨ Word: ${word}
بالعربي: ${meaning}

${example ? `English Context: ${example}` : ""}`);
          }
        }
      }

      // 2b. Definition block lookup (**Definition — ...**)
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q) && (lines[i].includes("Definition") || lines[i].includes("تعريف"))) {
          const heading = cleanText(lines[i]);
          const body = lines[i + 1] ? cleanText(lines[i + 1]) : "";
          return cleanText(`💡 ${heading}:

${body}`);
        }
      }
    }
  }

  // 3. Handcrafted Core Concept Lookups for Science Lesson 1 (Scoped to Lesson 1)
  if (isLesson1) {
    // 3a. Non-Living Things
    if (
      q.includes("non-living") ||
      q.includes("non living") ||
      q.includes("nonliving") ||
      q.includes("جماد") ||
      q.includes("جمادات") ||
      q.includes("غير حية") ||
      q.includes("غير حي") ||
      q.includes("غير حيّة")
    ) {
      return cleanText(`🪨 الجمادات والأشياء غير الحية (Non-Living Things):

English: Things around us that do not feed, grow, or breathe.
Examples: Air, water, rocks, stones, sun.

بالعربي: أشياء لا تتغذى ولا تنمو ولا تتنفس.
أمثلة: الهواء، الماء، الصخور، الحجارة، الشمس.`);
    }

    // 3b. Living Organisms
    if (
      !q.includes("non") &&
      !q.includes("غير") &&
      (q.includes("living") ||
        q.includes("كائن") ||
        q.includes("كائنات") ||
        q.includes("الكائنات") ||
        q.includes("حي") ||
        q.includes("حية"))
    ) {
      if (
        q.includes("صفات") ||
        q.includes("صفة") ||
        q.includes("خصائص") ||
        q.includes("خصيصة") ||
        q.includes("مميزات") ||
        q.includes("تتميز") ||
        q.includes("characteristics") ||
        q.includes("traits")
      ) {
        return cleanText(`🌱 صفات الكائن الحي الثلاث (3 Characteristics of Living Organisms):

1. Feeding (التغذية):
English: Takes in food for energy and growth.
بالعربي: يتغذى للحصول على الطاقة والنمو.

2. Growth (النمو):
English: Increases in size over time.
بالعربي: ينمو ويزيد حجمه بمرور الوقت.

3. Breathing (التنفس):
English: Takes in air to stay alive.
بالعربي: يتنفس الهواء للبقاء على قيد الحياة.`);
      }

      return cleanText(`🌱 الكائنات الحية (Living Organisms):

English: Everything that can feed, grow, and breathe.
Examples: Humans, animals (like dogs, sparrows, and frogs), plants (like trees and cacti).

بالعربي: كل ما يتغذى وينمو ويتنفس.
أمثلة: الإنسان، الحيوانات (مثل العصافير والكلاب والضفادع)، النباتات (مثل الأشجار والصبار).`);
    }

    if (q.includes("habitat") || q.includes("موئل") || q.includes("الموئل") || q.includes("موطن") || q.includes("بيئة")) {
      return cleanText(`🏡 الموئل (Habitat):

English: The place where a living organism lives.

بالعربي: المكان الذي يعيش فيه الكائن الحي ويجد فيه الطعام والماء والمأوى.`);
    }

    if (q.includes("step") || q.includes("explore") || q.includes("خطوات") || q.includes("استكشاف")) {
      return cleanText(`🧭 خطوات الاستكشاف الثلاث (3 Discovery Steps):

1. Guess (خَمِّن):
English: Predict where the organism lives.
بالعربي: توقع مكان المعيشة.

2. Search (ابحث):
English: Go out and search quietly.
بالعربي: اخرج وابحث بهدوء.

3. Record (سَجِّل):
English: Write down the name and location.
بالعربي: دون اسم الكائن ومكانه.\n\n/question29.jpg`);
    }

    if (q.includes("ant") || q.includes("نمل") || q.includes("النمل")) {
      return cleanText(`🐜 موئل النمل (Ants Habitat):

English: Under stones or underground in cool damp places.

بالعربي: تحت الصخور أو تحت الأرض في أماكن باردة ورطبة.`);
    }
  }

  // 4. Handcrafted Core Concept Lookups for Science Lesson 2 (Scoped to Lesson 2)
  if (isLesson2) {
    if (q.includes("magnify") || q.includes("glass") || q.includes("عدسة") || q.includes("مكبرة") || q.includes("مكبره")) {
      return cleanText(`🔍 العدسة المكبرة (Magnifying Glass):

English: A tool used to help see details of living organisms like insects and plants.

How to use:
1. Object can move (like a leaf): Hold glass close to eye, move object back and forth.
2. Object cannot move (like a tree trunk): Hold glass close to eye, move your face & glass together back and forth.

بالعربي: أداة تُستخدم لرؤية تفاصيل الكائنات الحية الدقيقة.
طريقة الاستخدام:
1. شيء يمكن تحريكه: قرّب العدسة للعين وحرّك الشيء للأمام والخلف.
2. شيء لا يمكن تحريكه: قرّب العدسة للعين وحرّك وجهك والعدسة معاً.`);
    }

    if (q.includes("record card") || q.includes("بطاقة تسجيل") || q.includes("بطاقة التسجيل") || q.includes("كارت")) {
      return cleanText(`📋 بطاقة التسجيل (Record Card):

English: A written and sketched record of observation including Topic, Date/Name, Sketch, and Sentences about Size, Color, Shape, and Location.

بالعربي: سجل مكتوب ومرسوم للملاحظة يتضمن:
1. الموضوع أولاً ثم الاسم والتاريخ.
2. رسم بسيط بخطوط رفيعة بدون تظليل (thin clear lines, no shading).
3. جمل توضح: الحجم، اللون، الشكل، والموقع.`);
    }

    if (q.includes("observe") || q.includes("observation") || q.includes("ملاحظة") || q.includes("نلاحظ") || q.includes("صفات الملاحظة")) {
      return cleanText(`🔍 صفات الملاحظة الثلاث (3 Features to Observe):

English: When observing living organisms, observe 3 features:
1. Shape (الشكل)
2. Color (اللون)
3. Size (الحجم)

بالعربي: عند ملاحظة الكائن الحي نركز على ثلاثة أشياء رئيسية: الشكل، اللون، والحجم.`);
    }

    if (q.includes("sun") || q.includes("caution") || q.includes("شمس") || q.includes("تحذير") || q.includes("قفازات") || q.includes("gloves")) {
      return cleanText(`⚠️ تحذيرات السلامة عند الملاحظة (Safety Precautions):

English:
1. Never look directly at the Sun with a magnifying glass (it harms your eyes).
2. Wear gloves to protect your hands from pollution.

بالعربي:
1. لا تنظر أبداً إلى الشمس عبر العدسة المكبرة لأنها تؤذي العين.
2. ارتدِ القفازات لحماية يديك من التلوث.`);
    }

    if (q.includes("beetle") || q.includes("dung") || q.includes("خنفساء")) {
      return cleanText(`🪲 خنفساء الروث (Dung Beetle):

English: Size: ~2 cm | Color: Black | Shape: Oval | Location: Ground near the Nile River.
Note: It rolls a round ball of dung backward while standing on its head.

بالعربي: الحجم حوالي 2 سم، اللون أسود، الشكل بيضاوي، تعيش قرب نهر النيل وتدحرج كرة الروث للخلف.`);
    }
  }

  // 4. Keyword Search Across Lesson Sections (Fallback for any lesson)
  if (sections && sections.length > 0) {
    for (const sec of sections) {
      if (sec.body_md.toLowerCase().includes(q)) {
        const matchingLines = sec.body_md
          .split("\n")
          .filter((line) => line.toLowerCase().includes(q) && !line.startsWith("#"))
          .map((line) => cleanText(line.replace(/^[*#-\d.]+\s*/, "")))
          .filter(Boolean);
        if (matchingLines.length > 0) {
          return cleanText(`📖 معلومة من الدرس (${cleanText(sec.heading)}):

${matchingLines[0].slice(0, 180)}`);
        }
      }
    }
  }

  // 5. Out of lesson file notice in Arabic
  return cleanText(`عذراً! هذه المعلومة غير مذكورة في ملف هذا الدرس (${title}).
أنا نُوّارة ومهمتي الإجابة فقط عن مفردات وشرح هذا الدرس! 💡 يمكنك كتابة رقم أي سؤال مثل Question 5!`);
}

/** Helper to generate dynamic, lesson-specific recommendation chips */
function getLessonSuggestions(
  lessonId: number,
  subject?: string,
  lessonTitle?: string,
  sections?: Section[]
): string[] {
  const title = (lessonTitle || "").toLowerCase();

  // 1. Science Lesson 1 (id: 12 or title matching "find living" / "lesson 1")
  const isLesson1 = lessonId === 12 || title.includes("find living") || title.includes("lesson 1");
  if (isLesson1) {
    return [
      "ما هو الموئل؟ (Habitat)",
      "الصفات الثلاث للكائن الحي",
      "Question 29 🖼️",
      "Question 20",
    ];
  }

  // 2. Science Lesson 2 (id: 13 or title matching "observe" / "lesson 2")
  const isLesson2 = lessonId === 13 || title.includes("observe") || title.includes("lesson 2");
  if (isLesson2) {
    return [
      "العدسة المكبرة (Magnifying Glass)",
      "بطاقة التسجيل (Record Card)",
      "تحذيرات السلامة ⚠️",
      "Question 1",
    ];
  }

  // 3. Subject-level fallbacks
  if (subject === "english") {
    return ["Five Senses", "taste", "hearing", "Question 1"];
  }

  if (subject === "math") {
    return ["المفاهيم الرئيسية", "Question 1", "Question 5"];
  }

  // 4. Dynamic extraction for any other lesson based on section headings
  const suggestions: string[] = [];
  if (sections && sections.length > 0) {
    for (const sec of sections) {
      const heading = sec.heading.toLowerCase();
      if (
        heading &&
        !heading.includes("exercise") &&
        !heading.includes("question") &&
        !heading.includes("تمرین")
      ) {
        const cleanH = sec.heading.replace(/^\d+\.\s*/, "").trim();
        if (cleanH && !suggestions.includes(cleanH)) {
          suggestions.push(cleanH);
        }
      }
      if (suggestions.length >= 3) break;
    }
  }

  if (suggestions.length === 0) {
    return ["مفاهيم الدرس", "شرح الكلمات", "Question 1", "Question 5"];
  }

  if (!suggestions.some((s) => s.toLowerCase().includes("question"))) {
    suggestions.push("Question 1");
  }

  return suggestions;
}

export function ScienceLessonChat({
  lessonId,
  sections,
  subject,
  lessonTitle,
}: {
  lessonId: number;
  sections?: Section[];
  subject?: string;
  lessonTitle?: string;
}) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);

  let userName = "أنت";
  try {
    const learner = useLearner();
    if (learner?.user?.name) {
      userName = learner.user.name;
    }
  } catch {
    // Fallback gracefully
  }

  function handleSend(textToSend: string) {
    const content = textToSend.trim();
    if (!content || busy) return;
    setBusy(true);

    // Get exact concise bilingual lesson-bound answer dynamically from the lesson sections
    const lessonAnswer = getLessonAnswer(content, sections, lessonTitle, subject, lessonId);

    // Instantly display crisp lesson answer in chat UI
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: lessonAnswer },
    ]);
    setQuestion("");
    setBusy(false);

    // Asynchronously log session in background if API is available
    void (async () => {
      try {
        const id =
          sessionId ??
          (await chatApi.createSession({ lesson_id: lessonId, mode: "science_explain" }))
            .session_id;
        setSessionId(id);
        await chatApi.sendMessage(id, { content });
      } catch {
        // Silent background catch
      }
    })();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleSend(question);
  }

  // Dynamic suggestion chips based on active lesson and subject
  const SUGGESTIONS = getLessonSuggestions(lessonId, subject, lessonTitle, sections);

  return (
    <section
      className="mx-5 my-6 rounded-2xl bg-[#eeeee9] border-2 border-[#d8ddd6] p-5 text-sm leading-7 shadow-xs"
      aria-label="اسأل نُوّارة عن الدرس"
      dir="rtl"
    >
      <div className="flex items-center gap-3 mb-2">
        <img
          src="/nawwara.jpeg"
          alt="نُوّارة"
          className="w-12 h-12 rounded-full object-cover border-2 border-[#527f76] shadow-xs flex-shrink-0"
          style={{ objectPosition: "center top" }}
        />
        <div>
          <h3 className="font-black text-lg text-[#292c32]">اسأل نُوّارة عن الدرس (Ask Nawwara)</h3>
          <p className="text-xs text-[#536b62] font-semibold">
            أنا نُوّارة! اطلب مني شرح أي نقطة أو اكتب رقم السؤال (مثال: Question 29) للمساعدة! ✨
          </p>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap gap-2 my-3">
        {SUGGESTIONS.map((sug) => (
          <button
            key={sug}
            type="button"
            onClick={() => void handleSend(sug)}
            className="bg-white border border-[#c4cebf] hover:bg-[#edf3e7] text-[#292c32] font-extrabold text-xs px-3 py-1.5 rounded-full transition-colors shadow-xs cursor-pointer"
          >
            💡 {sug}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div aria-live="polite" aria-busy={busy} className="my-3 space-y-3 max-h-80 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
              message.role === "user"
                ? "bg-[#527f76] text-white mr-auto max-w-[85%] rounded-tr-xs shadow-xs"
                : "bg-white border-2 border-[#d8ddd6] text-[#292c32] ml-auto max-w-[90%] rounded-tl-xs shadow-xs"
            }`}
          >
            {message.role === "user" ? (
              <strong className="block mb-1 opacity-90 font-black">👤 {userName}:</strong>
            ) : (
              <div className="flex items-center gap-1.5 mb-1 text-[#1e5c4a] font-black">
                <img
                  src="/nawwara.jpeg"
                  alt="نُوّارة"
                  className="w-5 h-5 rounded-full object-cover border border-[#527f76]"
                  style={{ objectPosition: "center top" }}
                />
                <span>نُوّارة:</span>
              </div>
            )}
            {message.content.includes("/question29.jpg") ? (
              <div>
                <p className="whitespace-pre-wrap">{message.content.replace("/question29.jpg", "").trim()}</p>
                <div className="rounded-xl overflow-hidden border-2 border-[#527f76]/30 my-2 shadow-xs bg-white">
                  <img
                    src="/question29.jpg"
                    alt="Question 29 Exploration Steps"
                    className="w-full h-auto object-cover max-h-60"
                  />
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          id="science-question"
          dir="auto"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1000}
          disabled={busy}
          required
          className="min-w-0 flex-1 rounded-xl bg-white border-2 border-[#d8ddd6] p-3 text-sm focus:outline-none focus:border-[#527f76] text-[#292c32]"
          placeholder="اسأل نُوّارة عن هذا الدرس... (مثال: يعني ايه...؟ / Question 29)"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-xl bg-[#527f76] hover:bg-[#3d655d] text-white font-extrabold px-5 py-3 text-sm transition-all disabled:opacity-50 border-b-4 border-b-[#345e53] cursor-pointer"
        >
          {busy ? "جاري الرد…" : "إرسال 🚀"}
        </button>
      </form>
    </section>
  );
}
