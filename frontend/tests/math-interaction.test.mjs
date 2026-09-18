import test from "node:test";
import assert from "node:assert/strict";
import { placeToken, readPlacements, interactionComplete, describeMathAnswer } from "../lib/math-interaction.ts";

test("moving a card to an occupied slot swaps cards without duplication", () => {
  assert.deepEqual(placeToken({ a: "one", b: "two" }, "b", "one", false), { a: "two", b: "one" });
  assert.deepEqual(placeToken({ a: "one" }, "b", "one", false), { b: "one" });
});
test("reusable digit tiles can fill repeated digits", () => {
  assert.deepEqual(placeToken({ a: "2" }, "b", "2", true), { a: "2", b: "2" });
});
test("partial and malformed saved answers cannot enable submission", () => {
  const activity = { kind: "slots", slots: [{ id: "a" }, { id: "b" }] };
  for (const answer of ["old text draft", "null", "[]", "{}", '{"a":"0"}', '{"a":"1","b":""}']) {
    assert.equal(interactionComplete(activity, answer), false);
  }
  assert.equal(interactionComplete(activity, '{"a":"0","b":"0"}'), true);
  assert.deepEqual(readPlacements('{"a":{}}'), {});
});
test("feedback shows readable labels instead of opaque token IDs", () => {
  const activity = { kind: "order", slots: [{ id: "a", label: "1" }], tokens: [{ id: "opaque", label: "Three million" }] };
  assert.equal(describeMathAnswer(activity, '{"a":"opaque"}'), "1: Three million");
});
test("marking repeated digits preserves position", () => {
  const activity = { kind: "mark_digits", number: "222", slots: [{ id: "circle", label: "Tens" }] };
  assert.equal(describeMathAnswer(activity, '{"circle":"1"}'), "Tens: 2 · position 2");
});
