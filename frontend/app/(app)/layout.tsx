import { TimerProvider } from "@/lib/timer-context";
import { BottomNav } from "@/components/BottomNav";
import { TimerModal } from "@/components/TimerModal";
import { LearnerProvider } from "@/lib/learner-context";

/**
 * App shell layout — wraps all main screens.
 * Provides TimerContext + renders BottomNav + TimerModal.
 * Leave room for the fixed navbar and its raised active icon.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LearnerProvider><TimerProvider>
      <div className="phone-shell">
        <main className="pb-28">{children}</main>
        <BottomNav />
        <TimerModal />
      </div>
    </TimerProvider></LearnerProvider>
  );
}
