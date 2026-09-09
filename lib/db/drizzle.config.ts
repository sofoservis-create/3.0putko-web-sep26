import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Relative, not path.join(__dirname, ...): drizzle-kit prefixes its own "./"
// onto `out` internally, so an already-absolute path here doubles up into a
// bogus relative one (".//home/user/...") and every migration/snapshot
// lookup 404s. drizzle-kit resolves relative paths against its own cwd,
// which must be this directory — see the "push"/"generate" scripts in
// package.json, both of which pass --config ./drizzle.config.ts from here.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
