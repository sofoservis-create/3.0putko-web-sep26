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
};

export default config;
