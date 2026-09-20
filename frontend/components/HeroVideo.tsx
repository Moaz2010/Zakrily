"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HeroVideo.module.css";

/**
 * Autoplaying YouTube hero.
 *
 * Browsers only allow autoplay when the video starts muted, so it does — and a
 * tap-to-unmute button is layered on top, since a muted hero with no way to
 * hear it is a dead end. Unmuting talks to the player over the IFrame API's
 * postMessage bridge, which avoids pulling in the whole YouTube JS SDK.
 */
export function HeroVideo({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // `enablejsapi` opens the postMessage channel; `playlist` pointing at the
  // same id is what actually makes `loop` work for a single video.
  const src =
    `https://www.youtube-nocookie.com/embed/${youtubeId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${youtubeId}` +
    `&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&enablejsapi=1`;

  useEffect(() => {
    // Give the player a moment to boot before offering the unmute control;
    // commands sent too early are silently dropped.
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  function command(func: "mute" | "unMute") {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*",
    );
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    command(next ? "mute" : "unMute");
  }

  return (
    <div className={styles.frame}>
      <div className={styles.ratio}>
        <iframe
          ref={frame}
          className={styles.video}
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          // The iframe is decorative motion behind the copy; the unmute button
          // is the real control, so keep the frame itself out of the tab order.
          tabIndex={-1}
        />
      </div>

      {/* Sits above the iframe so hero copy stays readable over busy footage. */}
      <div className={styles.scrim} aria-hidden="true" />

      {ready && (
        <button
          type="button"
          onClick={toggleSound}
          className={styles.sound}
          aria-pressed={!muted}
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
          <span>{muted ? "شغّل الصوت" : "كتم"}</span>
        </button>
      )}
    </div>
  );
}
