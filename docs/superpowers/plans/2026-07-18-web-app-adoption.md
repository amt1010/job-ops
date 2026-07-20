# Web App Adoption + Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `http://127.0.0.1:3000` serve the real Next.js career-ops web app (not the stub), and close the two feature gaps so a scanned job shows its evaluation output inline and a CV can be manually generated wherever one is missing.

**Architecture:** The web app is a local-first Next.js view that orchestrates the real career-ops engine by spawning the user's `claude` CLI headless (`/api/run`, `/api/assistant`, `/api/explore`). We do **not** touch the engine, scoring, or CLI modes. All work is in `web/` — repoint the launcher, delete the stub, and make three UI surfaces (scan card, pipeline row, a light stepper) reuse data/components that already exist.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind 4, `node --test` for pure-logic unit tests.

## Global Constraints

- All source changes live under `web/`. Do **not** modify the core engine, `modes/`, scoring, or any `*.mjs` outside `web/`.
- Local-first only: no new API keys, no cloud, no database. The app spawns the user's CLI.
- Never auto-submit an application (inherited hard rule). CV generation and evaluation are user-triggered.
- Reuse existing components/data — `GeneratePdfButton`, `useJobs`, `Badge`, the enrichment in `explorer-view.tsx`. Do not reimplement them.
- The dev server is launched with `npm --prefix web run dev` (Next dev, port 3000, host resolves to 127.0.0.1). `web/node_modules` is already installed.
- Follow existing code style: `cn()` for class merges, Tailwind tokens (`text-brand`, `bg-surface`, etc.), lucide-react icons.
- `claude` CLI is installed at `C:\Users\test\AppData\Roaming\npm\claude` and detected by the app. Real workers spend tokens — run the minimum needed to verify.

---

### Task 1: Delivery fix — repoint `npm run web` and delete the stub

**Files:**
- Modify: `package.json` (root) — the `"web"` script
- Modify: `web/README.md` — note that root `npm run web` launches it
- Delete: `web/server.mjs`, `web/app.js`, `web/index.html`, `web/styles.css`, `web/data-parser.mjs`, `web/data-parser.test.mjs`

**Interfaces:**
- Produces: a working `npm run web` that serves the real Next.js app at `http://127.0.0.1:3000`.

- [ ] **Step 1: Repoint the root `web` script and add a one-time installer**

In root `package.json`, change the `"web"` line and add `"web:install"` right after it. Current:

```json
    "web": "node web/server.mjs",
```

Replace with:

```json
    "web": "npm --prefix web run dev",
    "web:install": "npm --prefix web install",
```

- [ ] **Step 2: Delete the six stub files**

```bash
rm web/server.mjs web/app.js web/index.html web/styles.css web/data-parser.mjs web/data-parser.test.mjs
```

- [ ] **Step 3: Confirm nothing else references the stub**

Run: `grep -rn "server.mjs\|data-parser\|loadDashboardData\|buildAssistantReply" package.json web/README.md web/package.json`
Expected: no matches referencing the deleted files (the root `"web"` script no longer names `server.mjs`; `web/package.json` `dev/build/start` are unchanged Next scripts). If a match remains, remove that reference.

- [ ] **Step 4: Add a one-line pointer to `web/README.md`**

Under the `## Quick start` heading, after the existing fenced `npm run dev` block, add:

```markdown
From the repo root, `npm run web` launches this same app on http://127.0.0.1:3000
(run `npm run web:install` once first if `web/node_modules` is missing).
```

- [ ] **Step 5: Verify the real app serves at :3000**

Run (from repo root): `npm run web` in a background shell, wait for "Ready", then:
`curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/` → Expected: `200`
`curl -s http://127.0.0.1:3000/api/clis` → Expected: JSON containing `"id":"claude"..."installed":true`
Stop the background server after verifying.

- [ ] **Step 6: Commit** (skip if repo is not git-initialized — see plan note)

```bash
git add package.json web/README.md
git commit -m "feat(web): serve the real Next.js app via npm run web; remove stub"
```

---

### Task 2: Thread the tracker score + PDF status into scan offers

The `DiscoveryCard` needs the evaluation result for a scanned posting. A live worker gives it via `useJobs` (`job.result`), but a *persisted* evaluation (from a prior session) is only reachable through the enrichment in `explorer-view.tsx`, which today passes only `evaluatedN`. Add the score, status, and pdf-ready flag.

**Files:**
- Modify: `web/src/lib/format.ts` — add a `pdfIsReady` helper
- Test: `web/src/lib/format.test.mjs` (create)
- Modify: `web/src/components/explore/results-list.tsx` — extend `EnrichedOffer`
- Modify: `web/src/components/explore/explorer-view.tsx` — populate the new fields

**Interfaces:**
- Produces: `pdfIsReady(cell: string): boolean`
- Produces: `EnrichedOffer` gains `evaluatedScore?: string`, `evaluatedStatus?: string`, `pdfReady?: boolean`

- [ ] **Step 1: Write the failing test for `pdfIsReady`**

Create `web/src/lib/format.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd web && node --experimental-strip-types --test src/lib/format.test.mjs`
Expected: FAIL — `pdfIsReady` is not exported.

- [ ] **Step 3: Add the helper**

In `web/src/lib/format.ts`, add (near the other small exports):

```ts
/** The tracker's PDF cell counts as "CV ready" only when it carries the ✅ mark. */
export function pdfIsReady(cell: string): boolean {
  return (cell ?? "").includes("✅");
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `cd web && node --experimental-strip-types --test src/lib/format.test.mjs`
Expected: PASS.

- [ ] **Step 5: Extend the `EnrichedOffer` type**

In `web/src/components/explore/results-list.tsx`, change:

```ts
export type EnrichedOffer = DiscoveredOffer & { inPipeline: boolean; evaluatedN?: string };
```

to:

```ts
export type EnrichedOffer = DiscoveredOffer & {
  inPipeline: boolean;
  evaluatedN?: string;
  evaluatedScore?: string;
  evaluatedStatus?: string;
  pdfReady?: boolean;
};
```

- [ ] **Step 6: Populate the new fields in enrichment**

In `web/src/components/explore/explorer-view.tsx`, add the import (with the other `@/lib` imports):

```ts
import { pdfIsReady } from "@/lib/format";
```

Then change the enrichment return (currently `return { ...o, inPipeline, evaluatedN: ev?.n };`) to:

```ts
        return {
          ...o,
          inPipeline,
          evaluatedN: ev?.n,
          evaluatedScore: ev?.score,
          evaluatedStatus: ev?.status,
          pdfReady: ev ? pdfIsReady(ev.pdf) : undefined,
        };
```

- [ ] **Step 7: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit** (skip if not git)

```bash
git add web/src/lib/format.ts web/src/lib/format.test.mjs web/src/components/explore/results-list.tsx web/src/components/explore/explorer-view.tsx
git commit -m "feat(web): thread tracker score + pdf status into scan offers"
```

---

### Task 3: Show the evaluation output inline on the scan card (ask #3)

Today the card only shows an "Evaluated · view report" link once a posting is evaluated. Show the score + one-line verdict **inline**, sourced from the live worker (`job.result`) when present, else from the enriched tracker fields.

**Files:**
- Modify: `web/src/components/explore/discovery-card.tsx`
- Modify: `web/src/components/explore/results-list.tsx` — pass the new props through to `DiscoveryCard`

**Interfaces:**
- Consumes: `EnrichedOffer.evaluatedScore/evaluatedStatus/pdfReady` (Task 2), `Job.result` from `useJobs` (existing: `{ score, summary, tone }`), `Badge` from `@/components/ui/badge`.

- [ ] **Step 1: Pass the new fields from `ResultsList` into `DiscoveryCard`**

In `web/src/components/explore/results-list.tsx`, change the map:

```tsx
        {view.map((o) => (
          <DiscoveryCard key={o.url} offer={o} inPipeline={o.inPipeline} evaluatedN={o.evaluatedN} />
        ))}
```

to:

```tsx
        {view.map((o) => (
          <DiscoveryCard
            key={o.url}
            offer={o}
            inPipeline={o.inPipeline}
            evaluatedN={o.evaluatedN}
            evaluatedScore={o.evaluatedScore}
            evaluatedStatus={o.evaluatedStatus}
            pdfReady={o.pdfReady}
          />
        ))}
```

- [ ] **Step 2: Extend the `DiscoveryCard` signature and imports**

In `web/src/components/explore/discovery-card.tsx`, add the import:

```tsx
import { Badge } from "@/components/ui/badge";
```

Change the component signature:

```tsx
export function DiscoveryCard({ offer, inPipeline, evaluatedN }: { offer: DiscoveredOffer; inPipeline: boolean; evaluatedN?: string }) {
```

to:

```tsx
export function DiscoveryCard({
  offer,
  inPipeline,
  evaluatedN,
  evaluatedScore,
  evaluatedStatus,
  pdfReady,
}: {
  offer: DiscoveredOffer;
  inPipeline: boolean;
  evaluatedN?: string;
  evaluatedScore?: string;
  evaluatedStatus?: string;
  pdfReady?: boolean;
}) {
```

- [ ] **Step 3: Derive a single inline result (live worker wins, else tracker)**

In `discovery-card.tsx`, just after the existing `const statusLabel = ...` line, add:

```tsx
  // Inline evaluation result for this card: a worker that finished THIS session
  // (live score + verdict) takes precedence; otherwise fall back to the persisted
  // tracker score threaded in via enrichment.
  const liveScore = job?.result?.score != null ? String(job.result.score) : undefined;
  const inlineScore = liveScore ?? evaluatedScore;
  const inlineSummary = job?.result?.summary || "";
  const isEvaluated = Boolean(evaluatedN || doneEval);
```

- [ ] **Step 4: Render the score/verdict inline in the evaluated branch**

In `discovery-card.tsx`, replace the current evaluated branch:

```tsx
        {evaluatedN || doneEval ? (
          <a
            href={evaluatedN ? `/pipeline/${evaluatedN}` : job ? `/jobs/${job.id}` : "/pipeline"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-2 text-xs font-medium text-brand max-sm:min-h-[44px]"
          >
            <Check className="size-3.5" /> Evaluated · view report
          </a>
        ) : working ? (
```

with:

```tsx
        {isEvaluated ? (
          <div className="space-y-2">
            {inlineScore && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={job?.result?.tone ?? "muted"}>{inlineScore}/5</Badge>
                {inlineSummary && <span className="text-[12px] leading-snug text-muted">{inlineSummary}</span>}
                {evaluatedStatus && <span className="text-[11px] text-faint">· {evaluatedStatus}</span>}
              </div>
            )}
            <a
              href={evaluatedN ? `/pipeline/${evaluatedN}` : job ? `/jobs/${job.id}` : "/pipeline"}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-2 text-xs font-medium text-brand max-sm:min-h-[44px]"
            >
              <Check className="size-3.5" /> {inlineScore ? "View full report" : "Evaluated · view report"}
            </a>
          </div>
        ) : working ? (
```

(The `<Badge>` `tone` accepts `"good" | "warn" | "bad" | "muted"`, matching `JobResult.tone`.)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit** (skip if not git)

```bash
git add web/src/components/explore/discovery-card.tsx web/src/components/explore/results-list.tsx
git commit -m "feat(web): show evaluation score + verdict inline on scan cards"
```

---

### Task 4: Manual CV trigger on the scan card + refresh after eval (ask #4)

Surface the existing `GeneratePdfButton` on an evaluated card whose CV is not yet generated, and make the Explore page refresh its server snapshot when a worker finishes so `evaluatedN`/`pdfReady` populate.

**Files:**
- Modify: `web/src/components/explore/discovery-card.tsx`
- Modify: `web/src/components/explore/explorer-view.tsx` — refresh on `co-job-done`

**Interfaces:**
- Consumes: `GeneratePdfButton` (`{ n, company, pdfReady }`), `useRouter().refresh()`, the global `co-job-done` window event (dispatched by the jobs store when an `evaluate`/`pdf` worker finishes).

- [ ] **Step 1: Import `GeneratePdfButton` into the card**

In `web/src/components/explore/discovery-card.tsx`:

```tsx
import { GeneratePdfButton } from "@/components/generate-pdf-button";
```

- [ ] **Step 2: Render the CV trigger under the inline result**

In the `isEvaluated` block from Task 3, inside the `<div className="space-y-2">`, after the `<a … view report>` link, add:

```tsx
            {evaluatedN && (
              <div className="flex justify-center">
                <GeneratePdfButton n={evaluatedN} company={offer.company} pdfReady={Boolean(pdfReady)} />
              </div>
            )}
```

(`GeneratePdfButton` shows "Generate tailored CV (PDF)" when `pdfReady` is false, and flips to "View tailored CV" + regenerate when ready — no extra logic needed here.)

- [ ] **Step 3: Refresh the Explore server snapshot when a worker finishes**

In `web/src/components/explore/explorer-view.tsx`, confirm `useRouter` is imported (`import { useRouter } from "next/navigation";` — add if missing) and get the router in the component body (`const router = useRouter();` if not already present). Then add an effect near the other `useEffect`s:

```tsx
  // A worker just wrote a real tracker row / CV (co-job-done from the jobs store).
  // Re-run this server component so appsSnapshot picks up the new score + pdf state,
  // which populates evaluatedN/evaluatedScore/pdfReady on the cards.
  useEffect(() => {
    const onDone = (e: Event) => {
      const kind = (e as CustomEvent).detail?.kind;
      if (kind === "evaluate" || kind === "pdf") router.refresh();
    };
    window.addEventListener("co-job-done", onDone);
    return () => window.removeEventListener("co-job-done", onDone);
  }, [router]);
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit** (skip if not git)

```bash
git add web/src/components/explore/discovery-card.tsx web/src/components/explore/explorer-view.tsx
git commit -m "feat(web): manual CV trigger on scan cards; refresh explore after worker done"
```

---

### Task 5: Manual CV trigger on pipeline rows (ask #4, pipeline surface)

Add a "CV" column to the applications table so any evaluated row without a CV gets the generate button, and a "view CV" affordance when ready.

**Files:**
- Modify: `web/src/components/pipeline-view.tsx`

**Interfaces:**
- Consumes: `GeneratePdfButton` (`{ n, company, pdfReady }`), `pdfIsReady` (Task 2), the `Application` row fields (`n, company, score, pdf`).

- [ ] **Step 1: Import the button and helper**

In `web/src/components/pipeline-view.tsx`, add:

```tsx
import { GeneratePdfButton } from "@/components/generate-pdf-button";
import { pdfIsReady } from "@/lib/format";
```

- [ ] **Step 2: Add the header cell**

In the `<thead>` row, immediately after the `{SORT_KEYS.map(...)}` `</tr>`-closing `map` block (i.e. after the mapped `<th>`s, before `</tr>`), add a non-sortable header:

```tsx
                <th className="px-4 py-2.5 font-medium">CV</th>
```

- [ ] **Step 3: Add the row cell**

In the `<tbody>` `filtered.map(...)` row, after the date `<td>` (`{r.date}</td>`), add:

```tsx
                  <td className="px-4 py-3">
                    {r.score && r.score !== "—" ? (
                      <GeneratePdfButton n={r.n} company={r.company} pdfReady={pdfIsReady(r.pdf)} />
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit** (skip if not git)

```bash
git add web/src/components/pipeline-view.tsx
git commit -m "feat(web): add CV-generate column to the pipeline table"
```

---

### Task 6: Light guided "scan → evaluate → generate CV" stepper (ask #1)

Make the three-step pipeline legible with a small, presentational stepper on the Explore page. No backend, no new data.

**Files:**
- Create: `web/src/components/explore/pipeline-steps.tsx`
- Modify: `web/src/components/explore/explorer-view.tsx` — render it under the header

**Interfaces:**
- Produces: `PipelineSteps({ active }: { active: 1 | 2 | 3 })` — a static 3-step indicator.

- [ ] **Step 1: Create the stepper component**

Create `web/src/components/explore/pipeline-steps.tsx`:

```tsx
import { Search, Sparkles, FileDown } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = [
  { n: 1, label: "Scan jobs", icon: Search },
  { n: 2, label: "Evaluate & match", icon: Sparkles },
  { n: 3, label: "Generate CV", icon: FileDown },
] as const;

// Presentational only: shows the scan → evaluate → CV pipeline so the three
// destinations read as one flow. `active` highlights the current step.
export function PipelineSteps({ active }: { active: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const on = s.n <= active;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
                on ? "border-brand/30 bg-brand-soft text-brand" : "border-border text-faint",
              )}
            >
              <Icon className="size-3.5" /> {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-faint">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Render it on the Explore page**

In `web/src/components/explore/explorer-view.tsx`, import it:

```tsx
import { PipelineSteps } from "./pipeline-steps";
```

Then render it as the first child inside the `<header className="mb-6">` block (before the existing title row), passing `active={isResults ? 2 : 1}`:

```tsx
      <header className="mb-6">
        <PipelineSteps active={isResults ? 2 : 1} />
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit** (skip if not git)

```bash
git add web/src/components/explore/pipeline-steps.tsx web/src/components/explore/explorer-view.tsx
git commit -m "feat(web): add scan→evaluate→CV stepper to Explore"
```

---

### Task 7: End-to-end verification (drive the real app)

Prove the four asks work against the running app. This task writes no product code; it exercises behavior and records what was observed.

**Files:**
- None (verification only). Optionally append findings to the design doc's "Feasibility" section.

- [ ] **Step 1: Launch the app**

Run (repo root): `npm run web` in a background shell; wait for "Ready".
`curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/` → Expected `200`.

- [ ] **Step 2: Verify the scan surface renders with the stepper**

Open `http://127.0.0.1:3000/explore`. Run a free scan. Expected: results list of cards; the "Scan jobs → Evaluate & match → Generate CV" stepper is visible.

- [ ] **Step 3: Verify inline output after an evaluation (ask #3)**

Click **Evaluate** on one card (a real `claude` worker — spends a small amount of tokens). Wait for it to finish. Expected: the card shows a `X/5` badge + one-line verdict **inline** (not just a link), plus "View full report". Cross-check the same score appears on `/pipeline`.

- [ ] **Step 4: Verify the manual CV trigger (ask #4)**

On the just-evaluated card (CV not yet generated), click **Generate tailored CV (PDF)**. Expected: a `pdf` worker runs; on completion an `output/cv-*.pdf` exists and the button flips to **View tailored CV**. Confirm the same button is present on the matching `/pipeline` row's CV column and, when `❌`, generates there too.

Run to confirm the PDF was written: `ls -t output/cv-*.pdf | head -1` → Expected: a file dated today.

- [ ] **Step 5: Verify the chat window questioning (ask #2)**

Open the assistant/chat console. Ask a question (e.g. "which of my evaluated roles is the strongest fit?"). Expected: a streamed answer grounded in the tracker/reports. Then ask it to act (e.g. "generate a CV for #<n>") and confirm it triggers the CV worker (a `generatePdf` action).

- [ ] **Step 6: Verify the stub is gone**

Run: `ls web/server.mjs web/app.js web/index.html 2>&1` → Expected: "No such file". 
Run: `grep -rn "server.mjs" package.json` → Expected: no match.

- [ ] **Step 7: Record results and stop the server**

Note pass/fail for each ask. Stop the background dev server. If anything failed, invoke `superpowers:systematic-debugging` before claiming completion.

---

## Notes

- **Git:** the environment reports this checkout is **not** a git repository (`Is a git repository: false`). If so, skip every `git commit` step; if the user later runs `git init`, the commits can be made then. Do not fail a task solely because git is unavailable.
- **Type-stripping test runner:** `node --experimental-strip-types --test` runs the `.test.mjs` files that import `.ts` helpers directly (Node 24 is available). If a project convention already exists for running such tests, prefer it.
- **Token cost:** Tasks 3–4 verification and Task 7 spend real tokens via `claude`. Keep to one evaluation + one CV generation.
