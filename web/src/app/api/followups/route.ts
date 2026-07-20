import { execFile } from "node:child_process";
import fs from "node:fs";
import { careerOpsRoot, rootScript } from "@/lib/career-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The DEMAND loop: surface follow-ups due, via the core's own
// followup-cadence.mjs --json (the SAME calculator the CLI uses) — we never
// reimplement the cadence logic, we read its verdict (mirrors /api/doctor).
export async function GET() {
  const script = rootScript("followup-cadence");
  if (!fs.existsSync(script)) return Response.json({ available: false, metadata: null, entries: [] });
  const stdout = await new Promise<string>((resolve) => {
    execFile("node", [script, "--json"], { cwd: careerOpsRoot(), timeout: 12_000 }, (_e, out) => resolve(out || ""));
  });
  try {
    const start = stdout.indexOf("{");
    const j = JSON.parse(stdout.slice(start));
    const entries = Array.isArray(j.entries) ? j.entries : [];
    // Only surface GENUINELY-DUE follow-ups (overdue/urgent). Previously this fell
    // back to *all* actionable entries when nothing was overdue, so not-yet-due
    // ("waiting") rows showed under "Follow-ups due" and reappeared after every
    // refresh even once handled (issue #7). The cadence's own urgency verdict —
    // computed from applications.md + follow-ups.md — is the single source of truth.
    const due = entries.filter((e: { urgency?: string }) => /^(overdue|urgent)$/i.test(String(e.urgency))).slice(0, 6);
    return Response.json({ available: true, metadata: j.metadata ?? null, entries: due });
  } catch {
    return Response.json({ available: false, metadata: null, entries: [] });
  }
}
