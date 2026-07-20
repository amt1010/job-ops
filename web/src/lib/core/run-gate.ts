// Concurrency gate for headless CLI workers (/api/run). The web is a single local
// Node process, so a module-level semaphore is enough.
//
// Why this exists: a batch dispatch (e.g. "score shortlist" in inbox-triage) fires
// one fetch("/api/run") per posting with NO client-side limit. Each run spawns a
// heavyweight `claude -p` session; N at once starve the machine — some processes
// die at startup (non-zero exit, no output → the "is it installed?" false error),
// others crawl and get killed by the run timeout before writing their report.
// Gating spawns to a small pool makes a batch complete reliably, just staggered.

// Tunable, but default conservative: a local box running the Next server + full
// Claude Code sessions (each with its own model calls) can't take many at once.
const MAX = Math.max(1, parseInt(process.env.CAREER_OPS_MAX_PARALLEL || "2", 10) || 2);

let active = 0;
const queue: Array<() => void> = [];

/**
 * Acquire a worker slot. Resolves once a slot is free (immediately if the pool
 * isn't full). Call the returned release() exactly once when the worker is done
 * (terminal: close/error/cancel). Idempotent release — safe to call twice.
 */
export function acquireRunSlot(): Promise<() => void> {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    active--;
    const next = queue.shift();
    if (next) next();
  };
  if (active < MAX) {
    active++;
    return Promise.resolve(release);
  }
  return new Promise<() => void>((resolve) => {
    queue.push(() => {
      active++;
      resolve(release);
    });
  });
}

/** For diagnostics/tests. */
export function runGateState() {
  return { active, queued: queue.length, max: MAX };
}
