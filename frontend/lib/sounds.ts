/** Tiny synthesised UI sounds.
 *
 * Generated with the Web Audio API rather than shipped as audio files, so the
 * app stays light and the tones can be tuned in code. Everything is wrapped in
 * try/catch: audio is a nice-to-have and must never break an interaction.
 */

type Tone = { freq: number; start: number; length: number; type?: OscillatorType; gain?: number };

const MUTED_KEY = "zakrely_muted";
let context: AudioContext | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // Private browsing: fall back to sound-on for this session.
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || isMuted()) return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    // Browsers start the context suspended until a user gesture.
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function play(tones: Tone[]) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.value = tone.freq;
      const at = now + tone.start;
      const peak = tone.gain ?? 0.16;
      // Short attack then exponential decay reads as a "pop" rather than a beep.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + tone.length + 0.02);
    }
  } catch {
    // Never let a missing audio device break the UI.
  }
}

/** Light tick for taps and step changes. */
export const playTap = () => play([{ freq: 660, start: 0, length: 0.07, gain: 0.08 }]);

/** Rising two-note chime for a correct answer. */
export const playCorrect = () =>
  play([
    { freq: 784, start: 0, length: 0.13 },
    { freq: 1175, start: 0.09, length: 0.22 },
  ]);

/** Soft falling tone for a wrong answer — gentle, not punishing, for a 9-year-old. */
export const playWrong = () =>
  play([
    { freq: 320, start: 0, length: 0.16, type: "triangle", gain: 0.12 },
    { freq: 240, start: 0.1, length: 0.2, type: "triangle", gain: 0.1 },
  ]);

/** Four-note arpeggio for finishing a lesson. */
export const playComplete = () =>
  play([
    { freq: 523, start: 0, length: 0.16 },
    { freq: 659, start: 0.1, length: 0.16 },
    { freq: 784, start: 0.2, length: 0.16 },
    { freq: 1047, start: 0.3, length: 0.34 },
  ]);

/** Quiet blip as a streamed reply starts arriving. */
export const playMessage = () => play([{ freq: 880, start: 0, length: 0.06, gain: 0.06 }]);
