import test from "node:test";
import assert from "node:assert/strict";
import { selectEnglishVoice } from "../lib/pronunciation.ts";

test("prefers a female English voice over the default male voice", () => {
  const david = { name: "Microsoft David", lang: "en-US", default: true };
  const zira = { name: "Microsoft Zira Desktop", lang: "en-US", default: false };
  assert.equal(selectEnglishVoice([david, zira]), zira);
});

test("does not choose a non-English voice even when its name matches", () => {
  const english = { name: "English", lang: "en-GB", default: false };
  assert.equal(selectEnglishVoice([
    { name: "Female", lang: "ar-EG", default: true }, english,
  ]), english);
});

test("handles voices that have not loaded and devices without English voices", () => {
  assert.equal(selectEnglishVoice([]), undefined);
  assert.equal(selectEnglishVoice([{ name: "Arabic", lang: "ar-EG", default: true }]), undefined);
});
