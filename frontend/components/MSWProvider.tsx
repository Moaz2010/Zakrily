"use client";

/**
 * MSWProvider — starts the Mock Service Worker in development.
 *
 * Rendered as the first child of the root layout only when
 * NODE_ENV === "development". In production the component returns
 * children immediately without starting any worker.
 *
 * RTL note: this component has no UI — it's purely behavioural.
 */

import { useEffect, useState } from "react";

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(
    process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_USE_MOCKS === "false"
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_USE_MOCKS === "false") return;

    // Dynamically import so the MSW bundle is never included in production.
    import("../mocks/browser").then(({ worker }) => {
      worker
        .start({
          onUnhandledRequest: "warn",
          serviceWorker: { url: "/mockServiceWorker.js" },
        })
        .then(() => setReady(true));
    });
  }, []);

  if (!ready) {
    // Prevents a flash of un-mocked content on first load in dev.
    return null;
  }

  return <>{children}</>;
}
