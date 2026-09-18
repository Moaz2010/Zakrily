"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fmtTime, useTimer } from "@/lib/timer-context";
import styles from "./BottomNav.module.css";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3.5 10a3 3 0 0 1 1.1-2.3l5.5-4.5a3 3 0 0 1 3.8 0l5.5 4.5a3 3 0 0 1 1.1 2.3v9a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 19Z" />
    <path d="M8 17.5h8" fill="none" stroke="var(--nav-surface)" strokeOpacity=".18" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const LessonsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" />
  </svg>
);
const LeaderboardIcon = () => (
  <svg viewBox="0 0 28 26" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="15" width="8" height="9" rx="2.5" />
    <rect x="10" y="3" width="8" height="21" rx="2.5" />
    <path d="M18 10h5.5a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H18" />
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="7" r="3.5" /><path d="M6 21a2 2 0 0 1-2-2c0-3.4 3.6-6 8-6s8 2.6 8 6a2 2 0 0 1-2 2Z" />
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 4a1.5 1.5 0 0 1 2.2-1.3l17 10a1.5 1.5 0 0 1 0 2.6l-17 10A1.5 1.5 0 0 1 7 24Z" />
  </svg>
);

const pages = [
  { href: "/home", label: "home", Icon: HomeIcon, position: 10 },
  { href: "/lessons", label: "دروس", Icon: LessonsIcon, position: 30 },
  { href: "/leaderboard", label: "المتصدرين", Icon: LeaderboardIcon, position: 70 },
  { href: "/profile", label: "حسابي", Icon: ProfileIcon, position: 90 },
];

export function BottomNav({ timerSelection }: { timerSelection?: { minutes: number; start: () => void } }) {
  const pathname = usePathname();
  const { state, secondsLeft, openModal, stopTimer } = useTimer();
  const activePage = pages.find((page) => pathname === page.href || pathname.startsWith(`${page.href}/`));
  const isRunning = state === "running";
  const isIdle = state === "idle" || state === "done";

  function tab(page: typeof pages[number]) {
    return <NavTab key={page.href} href={page.href} label={page.label} active={activePage === page}>
      <page.Icon />
    </NavTab>;
  }

  return (
    <div className={styles.wrapper}>
      <nav dir="ltr" className={styles.nav} aria-label="التنقل الرئيسي"
        style={{ "--active-x": activePage ? `${activePage.position}%` : "-100px" } as CSSProperties}
        onClick={(event) => { if (timerSelection && (event.target as Element).closest("a")) stopTimer(); }}>
        {pages.slice(0, 2).map(tab)}
        <div className={styles.timerSlot}>
          <button type="button"
            onClick={timerSelection ? timerSelection.start : isRunning ? stopTimer : isIdle ? openModal : undefined}
            className={`${styles.timer} ${isRunning ? styles.running : ""}`}
            aria-label={timerSelection ? `ابدأ المذاكرة لمدة ${timerSelection.minutes} دقيقة` : isRunning ? `الوقت المتبقي ${fmtTime(secondsLeft)} — إنهاء الجلسة` : "اختر وقت المذاكرة"}
            title={isRunning ? "إنهاء الجلسة" : undefined}>
            {isRunning ? <span>{fmtTime(secondsLeft)}</span> : <PlayIcon />}
          </button>
        </div>
        {pages.slice(2).map(tab)}
      </nav>
      <span className="sr-only" role="status">{state === "done" ? "برافو! خلصت جلسة المذاكرة." : ""}</span>
    </div>
  );
}

function NavTab({ href, label, active, children }: {
  href: string; label: string; active: boolean; children: ReactNode;
}) {
  return <Link href={href} className={`${styles.tab} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
    <span className={styles.icon}>{children}</span>
    <span className={styles.label} dir="auto">{label}</span>
  </Link>;
}
