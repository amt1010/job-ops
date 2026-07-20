import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCvFiles, companySlug } from "./cv-pdf-match.ts";

const files = [
  "002-jumpcloud-cv.pdf",
  "AshishManiTripathi-EPAM-cv.pdf",
  "AshishManiTripathi-deloitte-cv.pdf",
  "notes.txt",
];

test("companySlug lowercases and hyphenates tokens", () => {
  assert.equal(companySlug("EPAM Systems"), "epam-systems");
  assert.equal(companySlug("JumpCloud"), "jumpcloud");
});

test("full-slug company matches its file", () => {
  assert.deepEqual(matchCvFiles(files, "JumpCloud"), ["002-jumpcloud-cv.pdf"]);
});

test("tracker full name resolves a file named with the leading token", () => {
  // "EPAM Systems" (tracker) → file is "…-EPAM-cv.pdf"
  assert.deepEqual(matchCvFiles(files, "EPAM Systems"), ["AshishManiTripathi-EPAM-cv.pdf"]);
});

test("leading-token fallback respects token boundaries (no Meta/Metabase bleed)", () => {
  const f = ["ACME-metabase-cv.pdf"];
  // "Meta Platforms" must NOT match "metabase"
  assert.deepEqual(matchCvFiles(f, "Meta Platforms"), []);
});

test("non-pdf and unrelated files are ignored", () => {
  assert.deepEqual(matchCvFiles(files, "Nonesuch Corp"), []);
});

test("empty company yields nothing", () => {
  assert.deepEqual(matchCvFiles(files, "   "), []);
});
