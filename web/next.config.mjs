/** @type {import('next').NextConfig} */
const nextConfig = {
  // Two lockfiles exist on purpose (repo root + web/), so Next would infer the
  // repo root as the workspace root. On Windows that misinference can send
  // Turbopack's postcss workers into an unbounded respawn loop that exhausts
  // all RAM (vercel/next.js#92978) — pin the root to this app.
  turbopack: { root: import.meta.dirname },
  // The app is served/opened at 127.0.0.1 (npm run web + the career-ops stub both
  // used 127.0.0.1), but Next dev only trusts `localhost` by default and blocks
  // cross-origin dev requests (HMR socket + client dev bootstrap) from any other
  // origin — which silently prevents hydration, so every CTA looks "dead" even
  // though SSR returns 200. Trusting 127.0.0.1 restores client interactivity.
  allowedDevOrigins: ["127.0.0.1"],
  // Allow a throwaway build dir (e.g. BUILD_DIST=.next-prod) so a production
  // `next build` can run without clobbering a live `next dev` .next.
  ...(process.env.BUILD_DIST ? { distDir: process.env.BUILD_DIST } : {}),
};

export default nextConfig;
