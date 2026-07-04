# Stack

This repo is a Cloudflare-native `vinext` bootstrap app. Keep this document in
sync when framework, runtime, or infrastructure behavior changes.

## Components

- **Framework:** `vinext`, a Vite-based implementation of the Next.js 16 App
  Router API. This is not stock Next.js. Check the installed Next and vinext
  docs before relying on framework behavior.
- **Hosting:** Cloudflare Workers, not Cloudflare Pages. `wrangler.jsonc`
  defines the Worker, assets, bindings, variables, and observability.
- **Database:** Cloudflare D1 via the `DB` binding. SQL migrations live in
  `migrations/` and are applied by Wrangler.
- **Auth:** Better Auth in `lib/auth/`, with email/password, optional Google
  OAuth, organization, admin, and bearer plugins.
- **Runtime bindings:** read with `import { env } from "cloudflare:workers"`.
  Local runtime values come from `.dev.vars`; production values come from
  Cloudflare vars and secrets.
- **UI:** shadcn/ui components, Tailwind, Base UI, and lucide icons.
- **Email:** Cloudflare Email Sending through the `EMAIL` binding and
  `lib/email.ts`.
- **Tests:** Vitest runs inside real workerd with a real in-memory D1 through
  `@cloudflare/vitest-pool-workers`. Browser smoke tests run through
  Playwright against the local vinext dev server.
- **Local data:** Offline Mode records use browser IndexedDB through
  `lib/local/`; see [local-data.md](local-data.md).
- **Backup/restore:** JSON export/import uses the versioned
  `senex.local-backup` envelope; see [export-import.md](export-import.md).
- **Test engine:** cognitive task contracts, runner states, quality flags,
  scoring, baselines, and trends live in `lib/test-engine/`; see
  [test-engine.md](test-engine.md).
- **Cognitive tasks:** task-specific definitions, stimulus generation, and
  scorers live in `lib/cognitive-tasks/`; see
  [cognitive-tasks.md](cognitive-tasks.md).
- **Deploys:** GitHub-connected Cloudflare Workers Builds are the intended
  production path. Production deploys run `pnpm run deploy:prod`, which checks
  migrations, applies D1 migrations to `senex-db`, then runs Wrangler deploy.
  Preview deploys run `pnpm run deploy:preview`.

## Sharp Edges

- `kysely` is pinned to `0.28.x` through `pnpm.overrides`. Better Auth's D1
  and sqlite chunks currently depend on symbols removed in `kysely` 0.29.
- `@base-ui/react`, `lucide-react`, and lucide's deep `Icon.mjs` module are
  excluded from Vite dependency pre-bundling in `vite.config.ts` so client
  boundaries stay visible to the RSC plugin.
- `pnpm typecheck` runs `vinext typegen` before `tsc --noEmit`.
- `wrangler.jsonc` currently uses compatibility date `2026-06-10` because the
  installed local workerd/miniflare binary rejects newer dates. Bump it only
  after `pnpm dev`, Vitest, and Playwright can start the local Worker runtime.
- `vitest.config.ts` does not point at `wrangler.jsonc`; tests declare their
  own bindings because the app Worker entry depends on vinext virtual modules.
- `playwright.config.ts` starts `pnpm dev` automatically unless
  `PLAYWRIGHT_BASE_URL` points at an existing server or preview URL.
- Keep all transactional email behind `lib/email.ts`; app code should not call
  `env.EMAIL.send` directly.
- Approved App Router/vinext usage patterns live in
  [framework-patterns.md](framework-patterns.md). ADRs live in
  [adr/](adr/).

## Validation Notes

- 2026-07-04: `pnpm build` succeeds, and `pnpm wrangler deploy --dry-run`
  confirms Wrangler redirects to the generated `dist/server/wrangler.json`,
  reads assets from `dist/client`, and sees the expected `DB`, `EMAIL`,
  `IMAGES`, `ASSETS`, and runtime variable bindings.
- 2026-07-04: No app-specific unsupported Next/vinext APIs were found during
  the foundation spike. Known vinext limitations are documented in
  [framework-patterns.md](framework-patterns.md).
