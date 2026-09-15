export const MIN_MINUTES = 5;
export const MAX_MINUTES = 120;
export const MINUTE_STEP = 5;
export const DEGREES_PER_MINUTE = 4.8;

export function clampMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return 15;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes / MINUTE_STEP) * MINUTE_STEP));
}

/** Shortest rotation across the -180/180 degree seam. */
export function angleDelta(previous: number, next: number) {
  return ((next - previous + 540) % 360) - 180;
}

export function remainingSeconds(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
