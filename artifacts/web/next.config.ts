import type { NextConfig } from "next";

const config: NextConfig = {
  // @workspace/db is published as raw TypeScript (its package.json points
  // "." straight at src/index.ts), so Next has to compile it rather than
  // treat it as a prebuilt dependency.
  transpilePackages: ["@workspace/db"],

  // `pg` is a native-ish Node driver — it must never be bundled into a
  // client chunk. Server Components import it through @workspace/db, and
  // this keeps it external to the server bundle too.
  serverExternalPackages: ["pg"],

  typedRoutes: true,

  // Replit serves the dev server through a *.replit.dev hostname, which is a
  // different origin from the localhost the server is bound to. Next.js 15
  // blocks cross-origin requests for its internal dev assets (/_next/*, HMR)
  // unless the origin is listed here — the symptom is a page that loads but
  // never hydrates, or hot reload that silently stops working, with only a
  // warning in the terminal to explain it.
  //
  // Dev-only. It has no effect on `next build` or production.
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.picard.replit.dev",
    "*.janeway.replit.dev",
  ],
};

export default config;
