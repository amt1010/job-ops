import { test } from "node:test";
import assert from "node:assert/strict";
import { pdfIsReady } from "./format.ts";

test("pdfIsReady true only when the cell contains the check mark", () => {
  assert.equal(pdfIsReady("✅"), true);
  assert.equal(pdfIsReady("[✅](output/cv.pdf)"), true);
  assert.equal(pdfIsReady("❌"), false);
  assert.equal(pdfIsReady("—"), false);
  assert.equal(pdfIsReady(""), false);
});
