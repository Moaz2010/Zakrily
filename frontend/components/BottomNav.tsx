"use client";
/**
 * BottomNav — Step 4:
 *   - Rounded floating pill shape (rounded-[28px]) with visible gap from left/right/bottom edges.
 *   - Order left-to-right: home, دروس, [center timer button], المتصدرين, حسابي.
 *   - Center button: play icon when idle, countdown pill when timer is active.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fmtTime, useTimer } from "@/lib/timer-context";

// SVG icons matching the reference
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const LessonsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
  </svg>
);

const LeaderboardIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M7 20V10m5 10V4m5 16v-8" strokeLinecap="round" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

// RTL / LTR: play icon
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#1A1A1A] fill-current translate-x-0.5">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export function BottomNav() {
  const pathname = usePathname();
  const { state, secondsLeft, openModal } = useTimer();

  const isRunning = state === "running";
  const isIdle    = state === "idle" || state === "done";

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none">
      <nav
        dir="ltr"
        className="pointer-events-auto w-[calc(100%-2rem)] max-w-[390px] flex items-center justify-between
                   rounded-[28px] bg-[#1F232B] px-3 py-2 shadow-2xl border border-white/5"
      >
        {/* 1. Home */}
        <NavTab href="/home" label="home" active={pathname === "/home"}>
          <div className={pathname === "/home" ? "flex items-center justify-center h-8 w-8 rounded-full bg-white/10 text-white" : "text-[#7A808C]"}>
            <HomeIcon />
          </div>
        </NavTab>

        {/* 2. دروس */}
        <NavTab href="/lessons" label="دروس" active={pathname.startsWith("/lessons")}>
          <div className={pathname.startsWith("/lessons") ? "text-white" : "text-[#7A808C]"}>
            <LessonsIcon />
          </div>
        </NavTab>

        {/* 3. CENTER: Play button / Timer countdown */}
        <button
          onClick={isIdle ? openModal : undefined}
          className={[
            "relative flex items-center justify-center rounded-full transition-transform active:scale-95 shadow-lg",
            isRunning
              ? "h-11 min-w-[72px] px-3 bg-[#2D8A6A] border-2 border-white/20 text-white text-xs font-bold tabular-nums"
              : "h-12 w-12 bg-white",
          ].join(" ")}
          aria-label={isRunning ? "وقت الدراسة المتبقي" : "ابدأ جلسة دراسة"}
        >
          {isRunning ? (
            <span>{fmtTime(secondsLeft)}</span>
          ) : (
            <PlayIcon />
          )}
        </button>

        {/* 4. المتصدرين */}
        <NavTab href="/leaderboard" label="المتصدرين" active={pathname === "/leaderboard"}>
          <div className={pathname === "/leaderboard" ? "text-white" : "text-[#7A808C]"}>
            <LeaderboardIcon />
          </div>
        </NavTab>

        {/* 5. حسابي */}
        <NavTab href="/profile" label="حسابي" active={pathname === "/profile"}>
          <div className={pathname === "/profile" ? "text-white" : "text-[#7A808C]"}>
            <ProfileIcon />
          </div>
        </NavTab>
      </nav>
    </div>
  );
}

function NavTab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex flex-col items-center justify-center min-w-[52px] gap-0.5 py-0.5 text-[11px] font-medium transition-colors",
        active ? "text-white" : "text-[#7A808C] hover:text-white/80",
      ].join(" ")}
    >
      {children}
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
