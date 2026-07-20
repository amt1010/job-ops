#!/usr/bin/env node
// Run a Next.js command with NODE_ENV forced to "production".
//
// WHY: `next build` (and `next start`) must run in production mode. When the
// ambient environment pins NODE_ENV=development — e.g. a machine/system-level
// NODE_ENV variable — Next respects it and loads React's DEVELOPMENT build while
// the production prerender runs. That mismatch makes the internal /_global-error
// and /_not-found pages crash during export with a null React hooks dispatcher:
//   TypeError: Cannot read properties of null (reading 'useContext')
// Forcing NODE_ENV here makes the production build immune to a leaked dev value.
//
// Implemented dependency-free (no cross-env) and shell-free: it spawns Next's own
// JS entry with the current `node` binary, so it works identically on Windows,
// macOS and Linux without any .cmd-shim quoting concerns.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
