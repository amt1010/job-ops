import Link from "next/link";

// Minimal, static 404. A custom not-found keeps Next from prerendering its default
// boundary through the client provider shell (which crashes the production build
// with a React dispatcher/useContext error under Next 16 + React 19).
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">404</p>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-landing">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That page doesn’t exist. Your data is safe in your local files.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-200"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
