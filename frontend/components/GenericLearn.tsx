"use client";

import { useState, useRef, ReactNode } from "react";
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

function FormattedContent({ text }: { text: string }) {
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
                  <span key={i}>{inline(cell.trim())}</span>
                ))}
            </div>
          );
        }
        const bullet = /^(?:\* |\d+\. |- )/.test(line);
        return (
          <p className={bullet ? styles.bullet : undefined} key={idx}>
            {bullet && <span aria-hidden="true">✦</span>}
            <span>{inline(line.replace(/^(?:### |\* |\d+\. |- )/, ""))}</span>
          </p>
        );
      })}
    </div>
  );
}

const ICONS = ["🌱", "💡", "🔍", "📚", "⭐", "🎯", "🧠", "✨", "🚀"];

export function GenericLearn({
  sections,
  onCompletePractice,
}: {
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
      if (para.length > 180 && !para.includes("\n")) {
        const sentences = para.split(/(?<=[.!?])\s+/);
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
          content: para,
          icon,
          badge: `فكرة ${cards.length + 1} | CONCEPT ${cards.length + 1}`,
        });
      }
    });
  });

  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = cards.length;
  const currentCard = cards[step];
  const isFinished = step === total;

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
          <span className={styles.duoBadge}>⭐ نقاط +10</span>
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
              <FormattedContent text={currentCard.content} />
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

      {/* Duolingo Arabic Action Footer */}
      <footer className={styles.duoFooter} dir="rtl">
        {!isFinished ? (
          <button
            type="button"
            className={styles.duoBtnNext}
            onClick={() => go(step + 1)}
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
