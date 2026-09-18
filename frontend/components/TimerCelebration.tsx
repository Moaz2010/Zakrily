"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useTimer } from "@/lib/timer-context";
import styles from "./TimerCelebration.module.css";

const colors = ["#f3ba4c", "#e88478", "#619188", "#a3cabb", "#edba9b", "#ad9bc9"];
const confetti = Array.from({ length: 64 }, (_, i) => ({
  "--x": `${(i * 37) % 100}%`,
  "--drift": `${((i * 53) % 180) - 90}px`,
  "--spin": `${i % 2 ? 540 : -620}deg`,
  "--delay": `${(i % 11) * 0.07}s`,
  "--duration": `${2.3 + (i % 7) * 0.19}s`,
  backgroundColor: colors[i % colors.length],
  borderRadius: i % 3 === 0 ? "50%" : "2px",
}) as CSSProperties);

export function TimerCelebration() {
  const { totalSeconds, stopTimer, openModal } = useTimer();
  const dialog = useRef<HTMLDialogElement>(null);
  const dismiss = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    dismiss.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      dir="rtl"
      aria-labelledby="timer-celebration-title"
      aria-describedby="timer-celebration-message"
      onCancel={(event) => { event.preventDefault(); stopTimer(); }}
    >
      <div className={styles.confetti} aria-hidden="true">
        {confetti.map((style, i) => <span key={i} style={style} />)}
      </div>
      <section className={styles.card}>
        <button className={styles.close} type="button" onClick={stopTimer} aria-label="إغلاق الاحتفال">×</button>
        <p className={styles.badge}><span aria-hidden="true">★</span> خلّصت وقت المذاكرة!</p>
        <div className={styles.bubble}>
          <h2 id="timer-celebration-title">برافو عليك، يا بطل!</h2>
          <p id="timer-celebration-message">كل شوية مذاكرة بتفرق.<br />أنا فخورة بيك وبمجهودك!</p>
        </div>
        <div className={styles.portrait}>
          <span className={styles.halo} aria-hidden="true" />
          <img src="/mom-celebration.png" alt="ماما فرحانة بيك ورافعة كاس النجمة" width={325} height={397} draggable={false} />
        </div>
        <p className={styles.duration}>{Math.round(totalSeconds / 60).toLocaleString("ar-EG")} دقيقة من المجهود الحلو <span aria-hidden="true">♡</span></p>
        <p className={styles.hint}>خد نفس، اشرب ميّه، واستمتع باستراحة صغيرة.</p>
        <button ref={dismiss} type="button" className={styles.primary} onClick={stopTimer}>وقت الاستراحة <span aria-hidden="true">☀</span></button>
        <button type="button" className={styles.secondary} onClick={openModal}>جاهز لجولة كمان</button>
      </section>
    </dialog>
  );
}
