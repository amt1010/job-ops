import { spawn, type ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Server-only (node imports). The agnostic runtimes career-ops can delegate to
// in headless mode (AGENTS.md). Install URLs from career-ops-docs.
export type CliSpec = {
  id: string;
  name: string;
  bin: string;
  run: string;
  url: string;
  /** headless invocation args for a single prompt */
  args: (prompt: string) => string[];
};

export const KNOWN: CliSpec[] = [
  { id: "claude", name: "Claude Code", bin: "claude", run: "claude -p", url: "https://claude.ai/code", args: (p) => ["-p", p] },
  { id: "codex", name: "Codex", bin: "codex", run: "codex exec", url: "https://github.com/openai/codex", args: (p) => ["exec", p] },
  { id: "gemini", name: "Gemini CLI", bin: "gemini", run: "gemini -p", url: "https://github.com/google-gemini/gemini-cli", args: (p) => ["-p", p] },
  { id: "opencode", name: "OpenCode", bin: "opencode", run: "opencode run", url: "https://opencode.ai", args: (p) => ["run", p] },
  { id: "copilot", name: "GitHub Copilot CLI", bin: "copilot", run: "copilot -p", url: "https://docs.github.com/en/copilot/github-copilot-in-the-cli", args: (p) => ["-p", p] },
  { id: "qwen", name: "Qwen CLI", bin: "qwen", run: "qwen -p", url: "https://qwen.ai/qwencode", args: (p) => ["-p", p] },
  { id: "antigravity", name: "Antigravity CLI", bin: "agy", run: "agy -p", url: "https://antigravity.google", args: (p) => ["-p", p] },
];

function searchDirs(): string[] {
  const home = os.homedir();
  const extra = [
    path.join(home, ".local/bin"),
    path.join(home, ".npm-global/bin"),
    path.join(home, ".bun/bin"),
    path.join(home, ".deno/bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
  ];
  if (process.platform === "win32") {
    // Windows CLIs frequently install under per-user AppData roots and don't
    // reliably add themselves to PATH (e.g. Antigravity → %LOCALAPPDATA%\agy\bin).
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    extra.push(
      path.join(localAppData, "agy", "bin"), // Antigravity CLI
      path.join(localAppData, "Microsoft", "WindowsApps"), // winget/Store shims
      path.join(appData, "npm"), // npm global prefix on Windows
    );
  }
  const fromPath = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  return [...new Set([...fromPath, ...extra])];
}

// On Windows, executables carry an extension (claude.exe, claude.cmd, ...).
// Mirror the shell's PATHEXT resolution so a native-installer claude.exe is
// found. Crucially we do NOT fall back to the bare, extensionless name on
// Windows: a bare file (e.g. the `copilot` launcher the VS Code extension ships)
// passes fs.accessSync(X_OK) — which is really just an existence check on
// Windows — yet CreateProcess cannot execute it, so spawn() dies with ENOENT
// (issue #5). Only files carrying a runnable extension are reported as installed.
// On POSIX, "" keeps the bare name (the normal case there).
function binCandidates(bin: string): string[] {
  if (process.platform !== "win32") return [bin];
  const pathext = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
  const exts = pathext
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean)
    // Only include extensions that `child_process.spawn()` can execute directly
    // (.exe/.com) or via a shell (.cmd/.bat) — see resolveCli/spawn handling.
    .filter((e) => [".com", ".exe", ".bat", ".cmd"].includes(e.toLowerCase()));
  return exts.map((ext) => bin + ext);
}

export function findBin(bin: string, dirs = searchDirs()): string | null {
  for (const dir of dirs) {
    for (const candidate of binCandidates(bin)) {
      const p = path.join(dir, candidate);
      try {
        fs.accessSync(p, fs.constants.X_OK);
        // Guard against a directory named like the binary passing the access
        // check — only a regular file is spawnable.
        if (!fs.statSync(p).isFile()) continue;
        return p;
      } catch {
        /* not here */
      }
    }
  }
  return null;
}

// A Windows .cmd/.bat shim (the shape npm global installs use) cannot be spawned
// directly on modern Node — spawn() throws EINVAL unless a shell runs it. Used by
// spawnCli to switch to shell-mode + stdin-delivered prompt on Windows.
export function isWindowsShim(binPath: string): boolean {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(binPath);
}

export type SpawnCliOpts = {
  binPath: string;
  spec: CliSpec;
  isClaude: boolean;
  prompt: string;
  /** Claude flags that follow "-p <prompt>" (output-format, tools, etc.). */
  claudeArgs?: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  /** Non-shim only: ignore stdin so the CLI doesn't wait on piped input. */
  ignoreStdin?: boolean;
};

// stdout/stderr are always configured as pipes below, so they're never null —
// narrow the type so callers can read them without a null guard (parity with the
// old ChildProcessWithoutNullStreams that plain spawn(binPath, args) returned).
export type CliChild = ChildProcess & { stdout: Readable; stderr: Readable };

// The ONE correct way to launch an agnostic CLI headlessly across platforms.
//
// POSIX / Windows .exe: spawn directly, prompt passed as an argv element —
// CreateProcess/execve carry a multiline argument verbatim.
//
// Windows .cmd/.bat shim: must run through a shell (direct spawn throws EINVAL),
// and cmd.exe's command-line re-parsing corrupts a multiline prompt
// (newlines / & | %VAR%). So the prompt is delivered over stdin — proven to
// survive verbatim — and argv is reduced to bare flags. The binary path is
// quoted because shell mode concatenates argv unescaped and the path may sit
// under an AppData directory containing spaces.
export function spawnCli(opts: SpawnCliOpts): CliChild {
  const { binPath, spec, isClaude, prompt, claudeArgs = [], cwd } = opts;
  const env = opts.env ?? process.env;
  const shim = isWindowsShim(binPath);

  let args: string[];
  if (isClaude) {
    args = shim ? ["-p", ...claudeArgs] : ["-p", prompt, ...claudeArgs];
  } else {
    args = shim ? spec.args("").filter((a) => a !== "") : spec.args(prompt);
  }

  const stdin: "pipe" | "ignore" = shim ? "pipe" : opts.ignoreStdin ? "ignore" : "pipe";
  const child = shim
    ? spawn(`"${binPath}"`, args, { cwd, env, shell: true, windowsHide: true, stdio: [stdin, "pipe", "pipe"] })
    : spawn(binPath, args, { cwd, env, stdio: [stdin, "pipe", "pipe"] });

  if (shim) {
    // Deliver the prompt verbatim, then EOF so the CLI stops reading stdin.
    try {
      child.stdin?.write(prompt);
      child.stdin?.end();
    } catch {
      /* child may have died synchronously */
    }
  }
  return child as CliChild;
}

export function detectClis() {
  const dirs = searchDirs();
  return KNOWN.map((c) => {
    const found = findBin(c.bin, dirs);
    return { id: c.id, name: c.name, run: c.run, url: c.url, installed: !!found, path: found };
  });
}

export function resolveCli(id: string): { spec: CliSpec; binPath: string } | null {
  const spec = KNOWN.find((c) => c.id === id);
  if (!spec) return null;
  const binPath = findBin(spec.bin);
  if (!binPath) return null;
  return { spec, binPath };
}
