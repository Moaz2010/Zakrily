import { TimerProvider } from "@/lib/timer-context";
import { BottomNav } from "@/components/BottomNav";
import { TimerModal } from "@/components/TimerModal";
import { LearnerProvider } from "@/lib/learner-context";

/**
 * App shell layout — wraps all main screens.
 * Provides TimerContext + renders BottomNav + TimerModal.
 *
 * The shell is exactly one viewport tall. Screens fill it and scroll their own
 * content region if needed, so the bottom nav is always reachable without
 * scrolling the page.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LearnerProvider><TimerProvider>
      <div className="phone-shell">
        <main>{children}</main>
        <BottomNav />
        <TimerModal />
      </div>
    </TimerProvider></LearnerProvider>
  );
}
