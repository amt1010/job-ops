// Tests for cleanChips() using Node's built-in test runner.
// Imports directly from clean-chips.mjs (the single source of truth) so the
// test and production code can never drift out of sync.
//
// Run:  node --test test-clean-chips.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanChips } from "./src/lib/clean-chips.mjs";

/** Split a raw input string the same way filter-builder's commit() does —
 *  on unambiguous item separators only (never bare spaces). */
function split(text) {
  return text.split(/[,\n;\t\r]+/);
}

test("comma-separated → 3 chips", () => {
  const parts = split("Afghanistan, Albania, Algeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("space-separated → 1 chip (NOT split — by design)", () => {
  const parts = split("Afghanistan Algeria Algeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan Algeria Algeria"]);
});

test("newline-separated → 3 chips", () => {
  const parts = split("Afghanistan\nAlbania\nAlgeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("semicolon-separated → 3 chips", () => {
  const parts = split("Afghanistan; Albania; Algeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("tab-separated → 3 chips", () => {
  const parts = split("Afghanistan\tAlbania\tAlgeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("carriage-return-separated → 3 chips", () => {
  const parts = split("Afghanistan\rAlbania\rAlgeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("mixed delimiters → 3 chips", () => {
  const parts = split("Afghanistan, Albania\nAlgeria; Algeria");
  // "Algeria" is duplicated (case-insensitive dedupe collapses it to 1),
  // leaving 3 unique chips: Afghanistan, Albania, Algeria.
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("stray tokens dropped: '*' → 0 chips", () => {
  assert.deepEqual(cleanChips(["*"]), []);
});

test("stray tokens dropped: '***' → 0 chips", () => {
  assert.deepEqual(cleanChips(["***"]), []);
});

test("stray tokens dropped: '---' → 0 chips", () => {
  assert.deepEqual(cleanChips(["---"]), []);
});

test("mixed with stray: 'Afghanistan, *, Albania, ***, Algeria' → 3 chips", () => {
  const parts = split("Afghanistan, *, Albania, ***, Algeria");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania", "Algeria"]);
});

test("empty/whitespace entries dropped: 'Afghanistan, , , Albania' → 2 chips", () => {
  const parts = split("Afghanistan, , , Albania");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "Albania"]);
});

test("deduplication (case-insensitive): 'Afghanistan, Afghanistan, ALBANIA, albania' → 2 chips", () => {
  const parts = split("Afghanistan, Afghanistan, ALBANIA, albania");
  assert.deepEqual(cleanChips(parts), ["Afghanistan", "ALBANIA"]);
});

test("multi-word entries preserved: 'Costa Rica, South Africa, United States' → 3 chips", () => {
  const parts = split("Costa Rica, South Africa, United States");
  assert.deepEqual(cleanChips(parts), ["Costa Rica", "South Africa", "United States"]);
});

test("realistic portals.yml config (33 roles) is fully preserved — not truncated", () => {
  // Regression for job-ops#10: a real portals.yml has ~33 positive title
  // filters. Capping them at 16 leaves the seeded field permanently AT the cap,
  // so every newly-typed role is silently dropped ("unable to add new roles").
  const roles = Array.from({ length: 33 }, (_, i) => `Role${i + 1}`);
  assert.equal(cleanChips(roles).length, 33);
});

test("cap at 64: 80 comma-separated countries → 64 chips", () => {
  const countries = Array.from({ length: 80 }, (_, i) => `Country${i + 1}`);
  const parts = split(countries.join(","));
  assert.equal(cleanChips(parts).length, 64);
});

test("'12345' → 1 chip (has digits)", () => {
  assert.deepEqual(cleanChips(["12345"]), ["12345"]);
});

test("'@' → 0 chips (no letters or digits)", () => {
  assert.deepEqual(cleanChips(["@"]), []);
});

test("null/undefined input → []", () => {
  assert.deepEqual(cleanChips(null), []);
  assert.deepEqual(cleanChips(undefined), []);
});

test("non-array string input wraps to single chip", () => {
  assert.deepEqual(cleanChips("Afghanistan"), ["Afghanistan"]);
});