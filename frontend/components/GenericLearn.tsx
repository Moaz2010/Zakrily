"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { lessonsApi } from "@/lib/api";
import { useLearner } from "@/lib/learner-context";
import { PronunciationButton } from "./PronunciationButton";
import styles from "./ScienceLearn.module.css";

interface Section {
  id: number;
  order_index: number;
  heading: string;
  body_md: string;
}

interface GenericCard {
  id: string;
  heading: string;
  content: string;
  icon: string;
  badge: string;
}

function clean(text: string) {
  return text.replace(/^---\s*$/gm, "").trim();
}

function inline(text: string): ReactNode {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part
  );
}

function englishPhrase(text: string): string | null {
  const matches = text.match(/[A-Za-z][A-Za-z0-9'’]*(?:\s+[A-Za-z][A-Za-z0-9'’]*)*/g) ?? [];
  return matches.sort((a, b) => b.length - a.length)[0]?.trim() || null;
}

function FormattedContent({ text, subject, lessonId }: { text: string; subject: string; lessonId: number }) {
  const lines = clean(text).split("\n").filter((l) => l.trim());
  return (
    <div className={styles.source}>
      {lines.map((line, idx) => {
        if (/^\|[- |]+\|$/.test(line)) return null;
        if (line.startsWith("|")) {
            return (
              <div className={styles.tableRow} key={idx}>
              {line
                .split("|")
                .filter((c) => c.trim())
                .map((cell, i) => (
                  <span key={i}>
                    {inline(cell.trim())}
                    {subject === "english" && englishPhrase(cell) && <PronunciationButton lessonId={lessonId} text={englishPhrase(cell)!} />}
                  </span>
                ))}
            </div>
          );
        }
        const bullet = /^(?:\* |\d+\. |- )/.test(line);
        return (
          <p className={bullet ? styles.bullet : undefined} key={idx}>
            {bullet && <span aria-hidden="true">✦</span>}
            <span>
              {inline(line.replace(/^(?:### |\* |\d+\. |- )/, ""))}
              {subject === "english" && englishPhrase(line) && <PronunciationButton lessonId={lessonId} text={englishPhrase(line)!} />}
            </span>
          </p>
        );
      })}
    </div>
  );
}

const ICONS = ["🌱", "💡", "🔍", "📚", "⭐", "🎯", "🧠", "✨", "🚀"];

export function GenericLearn({
  lessonId,
  subject,
  sections,
  onCompletePractice,
}: {
  lessonId: number;
  subject: string;
  sections: Section[];
  onCompletePractice?: () => void;
}) {
  const cards: GenericCard[] = [];

  // Decompose sections into short, bite-sized micro-cards
  sections.forEach((sec, sIdx) => {
    const icon = ICONS[sIdx % ICONS.length];
    const paragraphs = sec.body_md.split(/\n\s*\n/).filter((p) => p.trim());

    paragraphs.forEach((para, pIdx) => {
      // If a paragraph is still long, split by sentences
      const normalized = para.replace(/^>\s?/gm, "").trim();
      if (normalized.length > 180 && !normalized.includes("|")) {
        const sentences = normalized.replace(/\s*\n\s*/g, " ").split(/(?<=[.!?])\s+/);
        let currentSentences: string[] = [];
        sentences.forEach((sent, sentIdx) => {
          currentSentences.push(sent);
          if (currentSentences.join(" ").length > 120 || sentIdx === sentences.length - 1) {
            cards.push({
              id: `card-${sec.id}-${pIdx}-${sentIdx}`,
              heading: sec.heading,
              content: currentSentences.join(" "),
              icon,
              badge: `خطوة ${cards.length + 1} | STEP ${cards.length + 1}`,
            });
            currentSentences = [];
          }
        });
      } else {
        cards.push({
          id: `card-${sec.id}-${pIdx}`,
          heading: sec.heading,
          content: normalized,
          icon,
          badge: `فكرة ${cards.length + 1} | CONCEPT ${cards.length + 1}`,
        });
      }
    });
  });

  const [step, setStep] = useState(0);
  const { rewards, refresh } = useLearner();
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = cards.length;
  const currentCard = cards[step];
  const isFinished = step === total;

  useEffect(() => {
    let active = true;
    lessonsApi.learning(lessonId).then((saved) => {
      if (!active) return;
      setStep(Math.min(saved.learned_steps.length, total));
      setReady(true);
    }).catch(() => {
      if (active) { setReady(true); setSaveError("تعذر استرجاع التقدم. يمكنك المحاولة بالبطاقة الحالية."); }
    });
    return () => { active = false; };
  }, [lessonId, total]);

  async function advance() {
    if (saving || !ready) return;
    setSaving(true);
    try {
      await lessonsApi.saveLearning(lessonId, [step]);
      setSaveError("");
      go(step + 1);
      void refresh();
    } catch {
      setSaveError("تعذر حفظ البطاقة والنقاط. اضغط التالي للمحاولة مرة أخرى.");
    } finally { setSaving(false); }
  }

  function go(nextStep: number) {
    setStep(nextStep);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
  }

  if (total === 0) {
    return (
      <div className={styles.learnContainer} dir="rtl">
        <div className={styles.duoCard}>
          <p>تمت إضافة الدرس إلى المنهج. شرح الدرس سيكون متاحًا قريبًا.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.learnContainer} dir="auto">
      {/* Duolingo Header Bar with Arabic labels */}
      <header className={styles.duoHeader}>
        <div className={styles.headerLeft} dir="rtl">
          <span className={styles.duoBadge}>⭐ نقاط {rewards?.points ?? 0}</span>
          <span className={styles.stepCount}>
            بطاقة {isFinished ? total : step + 1} من {total}
          </span>
        </div>
        <div
          className={styles.duoProgress}
          role="progressbar"
          aria-valuenow={isFinished ? total : step + 1}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div
            className={styles.duoProgressBar}
            style={{ width: `${((isFinished ? total : step + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      {/* Viewport Frame - Zero Page Scroll */}
      <main className={styles.duoViewport}>
        {!isFinished && currentCard ? (
          <div className={styles.duoCard} key={currentCard.id}>
            <div className={styles.mascotRow}>
              <span className={styles.duoHeroIcon} aria-hidden="true">
                {currentCard.icon}
              </span>
              <div className={styles.mascotBubble}>
                <span className={styles.cardBadge}>{currentCard.badge}</span>
                <h3 ref={headingRef} tabIndex={-1}>
                  {currentCard.heading}
                </h3>
              </div>
            </div>
            <div className={styles.cardContentBody}>
              <FormattedContent text={currentCard.content} subject={subject} lessonId={lessonId} />
            </div>
          </div>
        ) : (
          <div className={styles.duoCelebrationCard} dir="rtl">
            <span className={styles.celebrationIcon} aria-hidden="true">
              🎉 🌟 🎯
            </span>
            <h3>ماشاء الله! أتممت الشرح بالكامل!</h3>
            <p>أنت الآن جاهز تماماً لبدء التدريبات واختبار فهمك لهذا الدرس.</p>
          </div>
        )}
      </main>

      {saveError && <p role="alert">{saveError}</p>}
      {/* Duolingo Arabic Action Footer */}
      <footer className={styles.duoFooter} dir="rtl">
        {!isFinished ? (
          <button
            type="button"
            className={styles.duoBtnNext}
            onClick={() => void advance()}
            disabled={saving || !ready}
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
          disabled={step === 0 || saving || !ready}
          onClick={() => go(step - 1)}
        >
          السابق →
        </button>
      </footer>
    </div>
  );
}
