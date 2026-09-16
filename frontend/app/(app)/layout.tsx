import { TimerProvider } from "@/lib/timer-context";
import { BottomNav } from "@/components/BottomNav";
import { TimerModal } from "@/components/TimerModal";
import { LearnerProvider } from "@/lib/learner-context";

/**
 * App shell layout — wraps all main screens.
 * Provides TimerContext + renders BottomNav + TimerModal.
 * Content area has pb-20 to clear the fixed navbar.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LearnerProvider><TimerProvider>
      <div className="phone-shell">
        <main className="pb-24">{children}</main>
        <BottomNav />
        <TimerModal />
      </div>
    </TimerProvider></LearnerProvider>
  );
}
