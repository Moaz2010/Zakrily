"use client";

/**
 * Explicit preview mode works in local and deployed builds.
 * Development defaults to preview; production requires USE_MOCKS=true.
 */

import { useEffect, useState } from "react";

const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true" ||
  (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_MOCKS !== "false");

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!useMocks);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!useMocks) return;

    import("../mocks/browser").then(({ worker }) => {
      return worker
        .start({
          onUnhandledRequest: "bypass",
          serviceWorker: { url: "/mockServiceWorker.js" },
        })
        .then(() => setReady(true));
    }).catch(() => setFailed(true));
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-[#F7F7F7] text-[#292C32] flex flex-col items-center justify-center gap-4 p-6 text-center" role={failed ? "alert" : "status"}>
      <p>{failed ? "تعذر تحميل التطبيق. أعد المحاولة." : "جاري تحميل ذاكرلي…"}</p>
      {failed && <button className="rounded-xl bg-[#527f76] text-white px-5 py-3" onClick={() => window.location.reload()}>إعادة المحاولة</button>}
    </div>;
  }

  return <>{children}</>;
}
