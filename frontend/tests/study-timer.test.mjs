import test from "node:test";
import assert from "node:assert/strict";
import { angleDelta, clampMinutes, remainingSeconds, DEGREES_PER_MINUTE } from "../lib/study-timer.ts";

test("duration stays within five-minute steps and handles invalid values", () => {
  assert.equal(clampMinutes(-10), 5);
  assert.equal(clampMinutes(0), 5);
  assert.equal(clampMinutes(17), 15);
  assert.equal(clampMinutes(18), 20);
  assert.equal(clampMinutes(999), 120);
  assert.equal(clampMinutes(Number.NaN), 15);
  assert.equal(clampMinutes(Infinity), 15);
});

test("rolling left increases duration; reversing the gesture restores it", () => {
  const start = 15;
  const forward = start - angleDelta(-90, -114) / DEGREES_PER_MINUTE;
  assert.equal(clampMinutes(forward), 20);
  assert.equal(clampMinutes(forward - angleDelta(-114, -90) / DEGREES_PER_MINUTE), 15);
});

test("dragging across the angle seam does not jump to a duration limit", () => {
  assert.equal(angleDelta(179, -179), 2);
  assert.equal(angleDelta(-179, 179), -2);
  assert.equal(clampMinutes(60 - angleDelta(179, -179) / DEGREES_PER_MINUTE), 60);
});

test("countdown catches up after a suspended tab and stops at zero", () => {
  const start = 1_000_000;
  const deadline = start + 15 * 60_000;
  assert.equal(remainingSeconds(deadline, start), 900);
  assert.equal(remainingSeconds(deadline, start + 1_001), 899);
  assert.equal(remainingSeconds(deadline, start + 10 * 60_000), 300);
  assert.equal(remainingSeconds(deadline, deadline), 0);
  assert.equal(remainingSeconds(deadline, deadline + 60_000), 0);
});
