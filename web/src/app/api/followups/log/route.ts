import fs from "node:fs";
import path from "node:path";
import { careerOpsRoot } from "@/lib/career-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Canonical follow-ups.md scaffold (mirrors FOLLOWUPS_HEADER in followup-seed.mjs).
// A follow-up is recorded as a TABLE ROW — that is the ONLY shape
// followup-cadence.mjs's parseFollowups() counts to advance the cadence. Writing
// a bullet line here (the previous behaviour) was inert: the row's followupCount
// stayed 0, so it never left the "due" list and reappeared after every refresh.
const HEADER_ROW = "| num | appNum | date | company | role | channel | contact | notes |";
const SEP_ROW = "|---|---|---|---|---|---|---|---|";

// True for a real data row (not the header or the |---| separator): starts with a
// pipe, has ≥8 cells, and its first cell parses as an integer follow-up num.
function followupRowNum(line: string): number | null {
  if (!line.startsWith("|")) return null;
  const parts = line.split("|").map((s) => s.trim());
  if (parts.length < 8) return null;
  const n = parseInt(parts[1], 10);
  return Number.isFinite(n) && String(n) === parts[1] ? n : null;
}

function cell(v: string): string {
  // Keep the value on one line and never let a stray pipe break the table shape.
  return v.replace(/[\r\n]+/g, " ").replace(/\|/g, "/").trim() || "-";
}

// Append-only follow-up log → data/follow-ups.md. Records a follow-up as a
// canonical table row so followup-cadence.mjs counts it and advances the
// schedule (mirrors how the CLI records a follow-up).
export async function POST(req: Request) {
  let body: { num?: string | number; company?: string; role?: string; channel?: string; contact?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const company = (body.company || "").toString().trim();
  if (!company) return Response.json({ error: "company required" }, { status: 400 });

  const appNum = body.num != null && String(body.num).trim() !== "" ? String(body.num).trim() : "-";
  const today = new Date().toISOString().slice(0, 10);
  const role = cell((body.role || "").toString());
  const channel = cell((body.channel || "Other").toString());
  const contact = cell((body.contact || "-").toString());
  const note = cell((body.note || "Followed up").toString());

  const file = path.join(careerOpsRoot(), "data", "follow-ups.md");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";

    // Next sequential follow-up num = max existing table-row num + 1.
    let maxNum = 0;
    let hasTable = false;
    for (const line of content.split("\n")) {
      if (line.replace(/\s+/g, "") === HEADER_ROW.replace(/\s+/g, "")) hasTable = true;
      const n = followupRowNum(line);
      if (n != null) maxNum = Math.max(maxNum, n);
    }
    const nextNum = maxNum + 1;
    const row = `| ${nextNum} | ${appNum} | ${today} | ${cell(company)} | ${role} | ${channel} | ${contact} | ${note} |`;

    let out = content;
    if (!content) {
      out = `# Follow-ups\n\n${HEADER_ROW}\n${SEP_ROW}\n${row}\n`;
    } else {
      if (!out.endsWith("\n")) out += "\n";
      // Inject the canonical table header once for legacy files that only carry
      // the pre-fix bullet history (no table yet).
      if (!hasTable) out += `\n${HEADER_ROW}\n${SEP_ROW}\n`;
      out += `${row}\n`;
    }
    fs.writeFileSync(file, out, "utf8");
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "write failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
