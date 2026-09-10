---
name: Putko browser e2e (Playwright)
description: How the Host Playwright suite runs in this environment and the pitfalls that cost time when adding tests.
---
Run with `pnpm --filter @workspace/putko run test:e2e` (also the `e2e-host` validation step). Config lives in `artifacts/putko/e2e/playwright.config.ts`.

- Chromium: no Playwright browser download is available; use the system binary (`/repl/tools/bin/chromium`, override with `PLAYWRIGHT_CHROMIUM_PATH`) via `launchOptions.executablePath` plus `--no-sandbox`.
- Target `http://localhost:80` (the artifact proxy), not the Vite port: only the proxy routes `/api` to the API server. The web and API workflows must be running first.
- Sessions are injected through localStorage (`user`, `token`, `role`, `appLanguage`) after the dev `/api/test-auth` endpoints create a verified traveler and activate host mode; no UI login except in the dedicated journey.
- Dev DB schema must be pushed (`pnpm --filter @workspace/db run push`) before tests touching newer tables; a 500 "Failed query … putko_test_host_*" means a table was never created here.
- Keep Vite from watching `e2e/` (`server.watch.ignored`); otherwise trace files written mid-run trigger page reloads in the app under test.
- Fastest selector fixes: read the YAML snapshot in `e2e/.results/<test>/error-context.md`. Desktop renders duplicate controls (sidebar + page, hidden mobile header), so scope to dialogs or use `.locator('visible=true')` / `.first()`.

**Why:** Each of these was discovered by a failing run; the suite is the release gate for the Host product.
**How to apply:** Whenever adding or debugging browser tests for Putko.
