"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { useTimer } from "@/lib/timer-context";
import { angleDelta, clampMinutes, DEGREES_PER_MINUTE, MAX_MINUTES, MIN_MINUTES, MINUTE_STEP } from "@/lib/study-timer";
import { StudentHeader } from "./StudentHeader";
import { BottomNav } from "./BottomNav";
import { TimerCelebration } from "./TimerCelebration";
import styles from "./TimerModal.module.css";

export function TimerModal() {
  const { state } = useTimer();
  if (state === "done") return <TimerCelebration />;
  return state === "selecting" ? <TimerPicker /> : null;
}

function TimerPicker() {
  const { startTimer, stopTimer } = useTimer();
  const [selected, setSelected] = useState(15);
  const [dragging, setDragging] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dial = useRef<HTMLDivElement>(null);
  const drag = useRef<{ angle: number; minutes: number } | null>(null);
  const close = useRef(stopTimer);
  close.current = stopTimer;

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    dial.current?.focus({ preventScroll: true });
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const element = dial.current!;
    let accumulated = 0;
    let lastWheel = 0;
    const roll = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      if (event.timeStamp - lastWheel > 180) accumulated = 0;
      lastWheel = event.timeStamp;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      accumulated += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1);
      if (Math.abs(accumulated) < 32) return;
      const steps = Math.trunc(accumulated / 32);
      accumulated %= 32;
      setSelected((minutes) => clampMinutes(minutes + Math.sign(steps) * Math.min(3, Math.abs(steps)) * MINUTE_STEP));
    };
    element.addEventListener("wheel", roll, { passive: false });
    return () => element.removeEventListener("wheel", roll);
  }, []);

  function pointerAngle(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - bounds.top - bounds.height / 2, event.clientX - bounds.left - bounds.width / 2) * 180 / Math.PI;
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { angle: pointerAngle(event), minutes: selected };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const angle = pointerAngle(event);
    const delta = angleDelta(drag.current.angle, angle);
    drag.current.angle = angle;
    drag.current.minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, drag.current.minutes - delta / DEGREES_PER_MINUTE));
    setSelected(clampMinutes(drag.current.minutes));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const changes: Record<string, number> = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 15, PageDown: -15 };
    if (event.key in changes) {
      event.preventDefault();
      setSelected((minutes) => clampMinutes(minutes + changes[event.key]));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setSelected(event.key === "Home" ? MIN_MINUTES : MAX_MINUTES);
    } else if (event.key === "Enter") {
      event.preventDefault();
      startTimer(selected);
    }
  }

  const labels = Array.from({ length: 7 }, (_, i) => selected + (i - 3) * MINUTE_STEP).filter((value) => value >= MIN_MINUTES && value <= MAX_MINUTES);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="timer-question" onCancel={(event) => { event.preventDefault(); close.current(); }}>
      <div className={styles.screen}>
        <div className={styles.header}><StudentHeader /></div>
        <div className={styles.scene}>
          <button type="button" onClick={stopTimer} className={styles.close} aria-label="إغلاق اختيار الوقت">×</button>
          <div className={styles.bubble}><h2 id="timer-question">يلا بينا،<br />هنذاكر قد<br />إيه النهاردة؟</h2></div>
          <img className={styles.mom} src="/mom-timer.png" alt="ماما بتشجعك تبدأ المذاكرة" width={398} height={423} draggable={false} />
          <div className={styles.dialEntrance}>
            <div className={styles.pointer} aria-hidden="true" />
            <div ref={dial} className={`${styles.dial} ${dragging ? styles.dragging : ""}`} role="slider" tabIndex={0} aria-label="مدة المذاكرة بالدقائق" aria-valuemin={MIN_MINUTES} aria-valuemax={MAX_MINUTES} aria-valuenow={selected} aria-valuetext={`${selected} دقيقة`} aria-describedby="dial-help" dir="ltr" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { drag.current = null; setDragging(false); }} onKeyDown={handleKeys}>
              <svg viewBox="0 0 600 600" className={styles.face} aria-hidden="true">
                <circle cx="300" cy="300" r="300" fill="#619188" />
                <circle cx="300" cy="300" r="222" fill="#466f67" />
                <g className={styles.rotor} style={{ transform: `rotate(${-(selected - 15) * DEGREES_PER_MINUTE}deg)` }}>
                  {Array.from({ length: 75 }, (_, i) => <path key={i} d="M300 40v13" transform={`rotate(${i * 4.8} 300 300)`} stroke="#a0c7bd" strokeWidth="8" />)}
                  {labels.map((minutes) => <g key={minutes} transform={`rotate(${(minutes - 15) * DEGREES_PER_MINUTE} 300 300)`}><text x="300" y="113" textAnchor="middle" fill="white" fontSize="29" fontWeight="800">{minutes}</text></g>)}
                </g>
                <path d="M46 264A257 257 0 0 1 300 43" stroke="#f6fff9" strokeWidth="12" fill="none" />
                <path d="M300 27v37" stroke="#d2fff5" strokeWidth="12" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className={styles.selection}>
            <p className={styles.duration}><strong>{selected}</strong> دقيقة</p>
            <p id="dial-help">لف الدائرة أو مرّر لاختيار وقتك</p>
            <div className={styles.adjustments}>
              <button type="button" onClick={() => setSelected((n) => clampMinutes(n - 5))} disabled={selected === MIN_MINUTES} aria-label="تقليل الوقت خمس دقائق">−</button>
              <span>اضغط ▶ وابدأ المذاكرة</span>
              <button type="button" onClick={() => setSelected((n) => clampMinutes(n + 5))} disabled={selected === MAX_MINUTES} aria-label="زيادة الوقت خمس دقائق">+</button>
            </div>
          </div>
        </div>
        <BottomNav timerSelection={{ minutes: selected, start: () => startTimer(selected) }} />
      </div>
    </dialog>
  );
}
