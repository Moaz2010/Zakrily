"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lessonsApi, type LessonSectionOut } from "@/lib/api";
import { CardDoodle } from "./CardDoodle";
import { EnglishVoiceTutor } from "./EnglishVoiceTutor";
import { MathChecker } from "./MathChecker";
import { useLearner } from "@/lib/learner-context";
import styles from "./TrainingActivities.module.css";
import feedbackStyles from "./StudySession.module.css";

function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </span>
  );
}

function Pattern() {
  return <CardDoodle className={styles.pattern} />;
}

export function TrainingActivities({
  subject,
  lessonId,
  lessonActivity = subject === "science",
}: {
  subject: string;
  lessonId: number;
  lessonActivity?: boolean;
}) {
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [answered, setAnswered] = useState(0);
  const [flashcards, setFlashcards] = useState(false);
  const base = `/lessons/${subject}/${lessonId}`;

  useEffect(() => {
    let active = true;
    setQuestionCount(null);
    if (lessonActivity) {
      lessonsApi
        .activity(lessonId)
        .then((data) => {
          if (active) {
            setQuestionCount(data.total);
            setAnswered(data.answered);
          }
        })
        .catch(() => {});
    } else {
      lessonsApi
        .quiz(lessonId)
        .then((data) => {
          if (active) setQuestionCount(data.questions.length);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [lessonId, lessonActivity]);

  return (
    <div className={styles.activities}>
      <ol className={styles.stages} aria-label="مراحل التعلم" dir="ltr">
        {["شرح", "تدريب", "اختبار", "امتحان"].map((label, i) => (
          <li key={label} className={i === 2 ? styles.currentStage : ""}>
            <span>{label}</span>
            <i />
          </li>
        ))}
      </ol>
      <Link href={`${base}/generated-quiz`} className={`${styles.card} ${styles.generated}`}>
        <Pattern />
        <h3>اختبر نفسك ✨</h3>
        <div className={styles.quizFooter}>
          <p>١٥ سؤال من الدرس · ٣ محاولات<br />اعرف مهاراتك ودرّب كل مهارة بـ١٠ أسئلة</p>
          <Arrow />
        </div>
      </Link>
      <Link href={`${base}/quiz`} className={`${styles.card} ${styles.quiz}`}>
        <Pattern />
        <h3>اختبار</h3>
        <div className={styles.quizFooter}>
          <p>
            جاهز تختبر فهمك؟
            <br />
            {questionCount !== null ? `${questionCount} أسئلة` : "راجع اللي اتعلمته"}
            {lessonActivity && questionCount !== null && (
              <>
                <br />
                {answered} إجابات محفوظة — كمل من مكانك
              </>
            )}
          </p>
          <Arrow />
        </div>
      </Link>
      <div className={styles.pair} dir="ltr">
        <Link href={`${base}/practice`} className={`${styles.card} ${styles.smart}`} dir="rtl">
          <Pattern />
          <h3>
            تدريب
            <br />
            ذكي
          </h3>
          <Arrow />
        </Link>
        <button
          type="button"
          onClick={() => setFlashcards(true)}
          className={`${styles.card} ${styles.flash}`}
          dir="rtl"
        >
          <Pattern />
          <h3>
            {subject === "english" ? (
              <>
                محادثة
                <br />
                صوتية
              </>
            ) : subject === "math" ? (
              <>
                مصحّح
                <br />
                الرياضيات
              </>
            ) : (
              <>
                بطاقات
                <br />
                تسميع
              </>
            )}
          </h3>
          <Arrow />
        </button>
      </div>
      {flashcards && subject === "english" && <EnglishVoiceTutor lessonId={lessonId} onClose={() => setFlashcards(false)} />}
      {flashcards && subject === "math" && <MathChecker lessonId={lessonId} onClose={() => setFlashcards(false)} />}
      {flashcards && subject === "science" && (
        <Flashcards
          lessonId={lessonId}
          subject={subject}
          lessonActivity={lessonActivity}
          onClose={() => setFlashcards(false)}
        />
      )}
    </div>
  );
}

function vocabularyCards(sections: LessonSectionOut[], subject: string): LessonSectionOut[] {
  if (subject === "english") {
    const vocabulary = sections.find((section) => /vocabulary/i.test(section.heading))?.body_md ?? "";
    const cards: LessonSectionOut[] = [];
    for (const line of vocabulary.split("\n")) {
      if (!line.startsWith("|") || line.includes("---") || /Word/i.test(line)) continue;
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (cells.length >= 2) {
        cards.push({
          id: cards.length + 1,
          order_index: cards.length,
          heading: cells[0],
          body_md: cells.slice(1).join("\n"),
        });
      }
    }
    return cards;
  }
  const vocabulary =
    sections.find((section) => section.heading.startsWith("4."))?.body_md ?? "";
  const parts = vocabulary.split(/^### (.+)$/m);
  const cards: LessonSectionOut[] = [];
  const format = (text: string) =>
    text
      .replace(/^---\s*$/gm, "")
      .replace(/Example\s*\/\s*Context:/g, "Example:")
      .replace(/\*\*/g, "")
      .replace(/\s*=\s*/g, " → ")
      .trim();
  for (let i = 1; i < parts.length; i += 2) {
    cards.push({
      id: i,
      order_index: cards.length,
      heading: parts[i].trim(),
      body_md: format(parts[i + 1]),
    });
  }
  const content =
    sections.find((section) => section.heading.startsWith("3."))?.body_md ?? "";
  const definitions = content.matchAll(
    /\*\*Definition — (.+?)\*\*\s*([\s\S]*?)(?=\n\*\*Definition|\n###|$)/g
  );
  for (const match of definitions) {
    if (!cards.some((card) => card.heading === match[1].trim())) {
      cards.push({
        id: 100 + cards.length,
        order_index: cards.length,
        heading: match[1].trim(),
        body_md: format(match[2]),
      });
    }
  }
  return cards;
}

function Flashcards({
  lessonId,
  subject,
  lessonActivity,
  onClose,
}: {
  lessonId: number;
  subject: string;
  lessonActivity: boolean;
  onClose: () => void;
}) {
  const cardTitle = subject === "english" ? "محادثة صوتية ومراجعة" : subject === "math" ? "مصحّح الرياضيات ومراجعة" : "بطاقات تسميع ومراجعة";
  const { user } = useLearner();
  const savedKey = `flashcards:${user.id}:${lessonId}`;
  const dialog = useRef<HTMLDialogElement>(null);
  const [sections, setSections] = useState<LessonSectionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [queue, setQueue] = useState<number[]>([]);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    let active = true;
    lessonsApi
      .get(lessonId)
      .then((data) => {
        if (!active) return;
        const cards = lessonActivity ? vocabularyCards(data.sections, subject) : data.sections;
        setSections(cards);
        setQueue(cards.map((_, i) => i));
        try {
          const saved = JSON.parse(localStorage.getItem(savedKey) ?? "null");
          if (
            lessonActivity &&
            saved?.version === 2 &&
            saved.cardCount === cards.length &&
            Array.isArray(saved.queue) &&
            saved.queue.every(
              (i: unknown) =>
                typeof i === "number" && Number.isInteger(i) && i >= 0 && i < cards.length
            ) &&
            new Set(saved.queue).size === saved.queue.length
          ) {
            setQueue(saved.queue);
            setRevealed(saved.revealed === true);
          } else if (
            saved &&
            Number.isInteger(saved.index) &&
            saved.index >= 0 &&
            saved.index < cards.length
          ) {
            setIndex(saved.index);
            setRevealed(saved.revealed === true);
            if (lessonActivity)
              setQueue([
                ...cards.map((_, i) => i).slice(saved.index),
                ...cards.map((_, i) => i).slice(0, saved.index),
              ]);
          }
        } catch {
          /* Storage fallback */
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      element.close();
    };
  }, [lessonId, lessonActivity, savedKey, subject]);

  useEffect(() => {
    if (loading || failed) return;
    try {
      localStorage.setItem(
        savedKey,
        JSON.stringify(
          lessonActivity
            ? { version: 2, cardCount: sections.length, queue, revealed }
            : { index, revealed }
        )
      );
    } catch {
      /* Storage fallback */
    }
  }, [index, revealed, loading, failed, savedKey, lessonActivity, sections.length, queue]);

  function handleRight() {
    setQueue((remaining) => remaining.slice(1));
    setRevealed(false);
  }

  function handleWrong() {
    setQueue((remaining) =>
      remaining.length > 1 ? [...remaining.slice(1), remaining[0]] : remaining
    );
    setRevealed(false);
  }

  const current = lessonActivity ? queue[0] : index;

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="flashcards-title"
      dir="rtl"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.dialogHeading}>
        <h2 id="flashcards-title">🗂️ {cardTitle}</h2>
        <button onClick={onClose} aria-label="إغلاق البطاقات">
          ×
        </button>
      </div>

      {loading ? (
        <p role="status">{subject === "english" ? "جاري تحميل المحادثة الصوتية…" : subject === "math" ? "جاري تحميل مصحّح الرياضيات…" : "جاري تحميل البطاقات…"}</p>
      ) : failed ? (
        <p role="alert">{subject === "english" ? "تعذر تحميل المحادثة الصوتية. حاول مرة أخرى." : subject === "math" ? "تعذر تحميل مصحّح الرياضيات. حاول مرة أخرى." : "تعذر تحميل البطاقات. حاول مرة أخرى."}</p>
      ) : !sections.length ? (
        <p>{subject === "english" ? "المحادثة الصوتية ستكون متاحة قريبًا." : subject === "math" ? "مصحّح الرياضيات سيكون متاح قريبًا." : "بطاقات هذا الدرس ستكون متاحة قريبًا."}</p>
      ) : lessonActivity && !queue.length ? (
        <div className={styles.flashFace} role="status">
          <span className="text-5xl block mb-2" aria-hidden="true">
            🌟 🎉
          </span>
          <h3>{subject === "english" ? "أتممت المحادثة الصوتية بنجاح!" : subject === "math" ? "أتممت تصحيح الرياضيات بنجاح!" : "راجعت كل البطاقات بنجاح!"}</h3>
          <p className="text-xs text-[#536b62] font-semibold my-2">
            {subject === "english" ? "أحسنت يا بطل! أتممت المحادثة الصوتية والمراجعة." : subject === "math" ? "أحسنت يا بطل! أتممت تصحيح المسائل الرياضية." : "أحسنت يا بطل! أتممت مراجعة كل الكلمات والبطاقات."}
          </p>
          <button
            className={styles.reveal}
            onClick={() => {
              setQueue(sections.map((_, i) => i));
              setRevealed(false);
            }}
          >
            مراجعة جديدة 🔄
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-bold text-[#536b62] mb-2">
            {lessonActivity
              ? `${sections.length - queue.length} من ${sections.length} مكتمل · متبقي ${queue.length} بطاقات`
              : `${index + 1} / ${sections.length}`}
          </p>

          <div className={styles.flashFace}>
            <h3 dir="auto">{sections[current].heading}</h3>

            {revealed ? (
              <p className={styles.answer} dir="auto">
                {sections[current].body_md}
              </p>
            ) : (
              <>
                <p className="text-xs text-[#63746d] my-2">
                  فكر في المعنى أولاً، ثم اضغط لإظهار الإجابة!
                </p>
                <button className={styles.reveal} onClick={() => setRevealed(true)}>
                  إظهار الإجابة 💡
                </button>
              </>
            )}

            {lessonActivity && revealed && (
              <div className="mt-4 pt-3 border-t border-[#d8ddd6]">
                <p className={styles.selfCheck}>هل كانت إجابتك صحيحة؟</p>
                <div className={styles.checkButtons}>
                  <button className={styles.rightButton} onClick={handleRight}>
                    ✅ صح
                  </button>
                  <button className={styles.wrongButton} onClick={handleWrong}>
                    ❌ غلط
                  </button>
                </div>
              </div>
            )}
          </div>

          {!lessonActivity && (
            <div className={styles.pagination}>
              <button
                disabled={index === 0}
                className={styles.secondary}
                onClick={() => {
                  setIndex(index - 1);
                  setRevealed(false);
                }}
              >
                السابق
              </button>
              <button
                disabled={index === sections.length - 1}
                className={styles.primary}
                onClick={() => {
                  setIndex(index + 1);
                  setRevealed(false);
                }}
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
