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
  `@cloudflare/vitest-pool-workers`.
- **Deploys:** GitHub-connected Cloudflare Workers Builds are the intended
  production path. Production deploys run `pnpm run deploy:prod`, which checks
  migrations, applies D1 migrations to `senex-db`, then runs Wrangler deploy.
  Preview deploys run `pnpm run deploy:preview`.

## Sharp Edges

- `kysely` is pinned to `0.28.x` through `pnpm.overrides`. Better Auth's D1
  and sqlite chunks currently depend on symbols removed in `kysely` 0.29.
- `@base-ui/react` is excluded from Vite dependency pre-bundling in
  `vite.config.ts` so per-file `"use client"` directives are preserved for RSC.
- `pnpm typecheck` runs `vinext typegen` before `tsc --noEmit`.
- `vitest.config.ts` does not point at `wrangler.jsonc`; tests declare their
  own bindings because the app Worker entry depends on vinext virtual modules.
- Keep all transactional email behind `lib/email.ts`; app code should not call
  `env.EMAIL.send` directly.
