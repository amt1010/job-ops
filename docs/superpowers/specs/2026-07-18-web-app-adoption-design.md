# Web App Adoption + Gap Closure — Design

**Date:** 2026-07-18
**Status:** Approved for planning
**Author:** pairing session (career-ops)

## Problem

The user is testing the career-ops web app at `http://127.0.0.1:3000` and reports key
features missing: they want the full pipeline (scan jobs → matching → CV creation) inside
the web app, the interactive "questioning" surfaced in a chat window, the final output
shown next to the jobs returned by a scan, and a way to manually trigger CV creation for
job results that don't have a CV yet.

### Root cause

There are **two** web apps in the repo:

1. **A stub** — `web/server.mjs` + `web/app.js` + `web/index.html` + `web/styles.css` +
   `web/data-parser.mjs`, launched by the root `npm run web` script and served at
   `127.0.0.1:3000`. Its "features" are fake: the assistant is a hardcoded template string
   (`data-parser.mjs` `buildAssistantReply`), "Generate PDF" emits a stub HTML page with a
   CV *summary* (not a tailored CV), and there is no real scan, matching, or chat.

2. **The real app** — a full Next.js app in `web/src/` that already implements everything
   the user is asking for. Its dependencies were never installed (`web/node_modules` was
   missing), so it never ran; the stub shipped in its place.

This is therefore **not a rewrite** — the real app exists and works. The task is to make it
the app that runs, close two genuine feature gaps, and verify the whole flow end-to-end.

## Feasibility (verified this session)

- `web/` dependencies installed cleanly (`npm install`, 156 packages, exit 0).
- `next dev` boots on this Windows machine: Next.js 16.2.10 (Turbopack), ready in ~340ms.
- `GET /` → HTTP 200 (~62 KB). `GET /api/clis` → detects **Claude Code installed**
  (`C:\Users\test\AppData\Roaming\npm\claude`). `GET /api/doctor` → `onboardingNeeded:false`,
  no missing prerequisites (CV, profile, portals all present); only a non-blocking
  "Playwright MCP tools not detected" warning (headless workers fall back to WebFetch).

## Architecture (unchanged — this is the correct design)

The web app is a **local-first view that orchestrates the real career-ops engine**. It does
not reimplement scoring. It spawns the user's own AI CLI (`claude -p …`) headless and
streams NDJSON progress back to the browser, so a web evaluation is byte-identical to a CLI
one (single source of truth). No API keys, no cloud, no separate database. Relevant routes:

- `POST /api/run` — kinds `evaluate` (real `modes/oferta.md` + persists report + tracker row
  via `reserve-report-num.mjs` → `reports/` → `batch/tracker-additions/` → `merge-tracker.mjs`),
  `pdf` (real `modes/pdf.md` → `output/` + flips tracker PDF column), `research`, `fix-portal`.
- `POST /api/assistant` — the chat console; drives the CLI read-only and emits action
  envelopes (`navigate`, `evaluate`, `evaluateCompany`, `generatePdf`, `setStatus`, `apply`,
  `remember`, `setProfile`, …) that the dashboard executes through gated endpoints.
- `GET /api/explore` (+ `/api/explore/ai`) — the free reverse-ATS scan and AI discovery.

### Two modes of AI (design decision, kept as-is)

- **Chat console** — interactive. This is the user's "questioning in a chat window": the
  user types, it asks/answers, and it can trigger actions. Reachable from every screen.
- **Evaluate / CV workers** — headless (`claude -p`), so they cannot pause mid-run to ask a
  clarifying question; they run autonomously and report their result + steps to the job view.

The questioning therefore lives in the chat; the workers are fire-and-report. A worker that
*stops to ask mid-evaluation* is explicitly **out of scope** for this design (bigger change;
scope separately if the user wants it).

## Decisions

- **Serve mode:** repoint the root `npm run web` script to launch the real Next.js **dev**
  server on `127.0.0.1:3000` (fast boot, hot reload; best while iterating).
- **Stub:** **delete** `web/server.mjs`, `web/app.js`, `web/index.html`, `web/styles.css`,
  `web/data-parser.mjs`, `web/data-parser.test.mjs` so there is one web app and no confusion.

## Scope — what will be built

### A. Delivery fix
1. Repoint root `package.json` `"web"` script from `node web/server.mjs` to launch the real
   app on port 3000 (e.g. `npm --prefix web run dev`, binding `127.0.0.1:3000`).
2. Delete the six stub files listed above.
3. Ensure a first-run install path: if `web/node_modules` is absent, the launch should
   install (or the script/README must state the one-time `npm --prefix web install`).
4. Update the root `README`/docs pointer so "the web app" unambiguously means the Next.js app.

### B. Gap 1 — final output next to scanned jobs (ask #3)
Today the `DiscoveryCard` (scan result) only shows an "Evaluated · view report" link once a
posting is evaluated. Change it to show the **result inline** on the card:
- the A–F score badge + one-line verdict/summary,
- the CV/PDF status (generated ✅ / not yet),
- keep "view report" as a secondary link.
Source the result from the jobs store (a finished `evaluate` worker for that URL) and/or the
tracker row matched by URL. No new engine work — presentation only.

### C. Gap 2 — manual CV trigger where CV is missing (ask #4)
Today `GeneratePdfButton` (a complete generate → generating → view/regenerate control that
runs the real `pdf` worker) lives **only** on the report detail page (`report-view.tsx`).
Surface it wherever a job result is shown without a CV:
- on the `DiscoveryCard` after evaluation when PDF is ❌,
- on the pipeline table rows (`pipeline-view.tsx`) when PDF is ❌.
Reuse the existing `GeneratePdfButton` component as-is; only add render sites + the `pdfReady`
signal per row. Keep the cost affordance (token spend badge) it already carries.

### D. Gap 3 — coherent "one pipeline" flow (ask #1)
The three steps (scan → evaluate → CV) already exist across Explore, Pipeline, and the report
page. Add a light guided path so it reads as a single pipeline rather than three destinations
— e.g. a clear "Scan → Evaluate → Generate CV" progression on the home/Explore surface and
next-step affordances on cards. Minimal, presentational; no new backend.

### E. Verification (end-to-end, before calling it done)
Drive the real running app and observe:
1. `npm run web` serves the real app at `127.0.0.1:3000`.
2. Scan (Explore) returns roles; a card renders.
3. Evaluate a real posting → worker runs on `claude`, report + tracker row persist, and the
   **score + verdict appear inline on the scan card** and in the pipeline.
4. On an evaluated result with no CV, click the **manual "Generate tailored CV"** button →
   `pdf` worker runs, `output/` PDF is written, tracker PDF flips to ✅, "View tailored CV"
   appears.
5. Chat console answers a question and successfully fires at least one action
   (e.g. `generatePdf` / `navigate`).
6. The stub is gone and nothing references it.

## Out of scope

- Rewriting or reskinning the existing app beyond the two gap fixes + the guided-flow polish.
- Making headless workers pause to ask clarifying questions mid-run.
- Any change to the core engine, scoring, or the CLI modes.
- Cloud/hosted deployment, auth, or multi-user — this stays local-first.

## Risks / notes

- **Token cost:** evaluate and CV workers spend the user's AI tokens. The UI already surfaces
  this (cost badges); verification will run a *small* number of real workers, with the user's
  awareness.
- **Playwright MCP not detected:** headless evaluations fall back to WebFetch and mark the
  report "Verification: unconfirmed (batch mode)". Acceptable; not a blocker.
- **Repo is not a git checkout** (`Is a git repository: false`), so the design doc is written
  but not committed. If the user later `git init`s, commit it then.
