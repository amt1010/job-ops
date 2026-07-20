"use client";

// Minimal, self-contained global error boundary. Next's built-in fallback
// prerenders through React context that isn't available at build time under
// Next 16 + React 19 (useContext-on-null); a plain client component with its
// own <html>/<body> and no context/hook dependencies renders cleanly instead.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0a0a0a",
          color: "#f7f6f3",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            An unexpected error occurred. Your data is safe — it lives in your local files.
          </p>
          <button
            onClick={() => reset()}
            style={{
              border: "1px solid #444",
              background: "transparent",
              color: "inherit",
              borderRadius: 8,
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
