# Deployment

Senex is configured for Cloudflare Workers Builds. The normal production path
is GitHub push or merge, Cloudflare build, production D1 migrations, then Worker
deploy.

Release readiness is tracked in [release-gates.md](release-gates.md). Complete
the relevant release checklist before promoting a preview or production build.

```text
branch / pull request
        |
        v
GitHub Actions CI
        |
        v
merge to the production branch
        |
        v
Cloudflare Workers Build
        |
        v
production D1 migrations
        |
        v
production Worker
```

## What Deploys

- `pnpm build` runs vinext and emits the production build.
- `wrangler.jsonc` points at `worker/index.ts` and `dist/client`.
- The `DB` binding connects the Worker to D1.
- The `EMAIL` binding sends transactional email through Cloudflare Email
  Sending.
- `scripts/deploy-prod.sh` applies production D1 migrations before deploying.

## One-Time Cloudflare Setup

1. Create the D1 database and set `database_id` in `wrangler.jsonc`. See
   [database.md](database.md).
2. Create or connect a Cloudflare Worker named `senex`.
3. Configure the build path:

   ```text
   /
   ```

4. Configure the build command:

   ```bash
   pnpm install --frozen-lockfile && pnpm run build
   ```

5. Configure the production deploy command:

   ```bash
   pnpm run deploy:prod
   ```

   This runs the destructive-migration guard, applies pending production D1
   migrations, then deploys the Worker.

6. Configure the non-production branch deploy command:

   ```bash
   pnpm run deploy:preview
   ```

   Preview deploys upload a Worker version only. They do not run production
   migrations.

7. Set production secrets and plain variables. See
   [environment-variables.md](environment-variables.md).

If the deploy step cannot apply D1 migrations, the Cloudflare build token may
need explicit D1 edit permission.

## Cloudflare API Token

The default Workers Builds token may not have D1 edit permission. If migrations
fail with a permissions error, configure Workers Builds with a custom API token
that can deploy Workers and edit D1.

Minimum useful permissions:

- Account: Workers Scripts - Edit
- Account: D1 - Edit
- Account: Account Settings - Read
- User: User Details - Read
- User: Memberships - Read
- Zone: Workers Routes - Edit, if using routes or custom domains

## Preview Builds

Preview builds must not apply production migrations. If preview deployments are
enabled, use a deploy command that uploads a Worker version without running
`pnpm db:remote:migrate`.

The repo script is:

```bash
pnpm run deploy:preview
```

which runs:

```bash
wrangler versions upload
```

## Migration Safety

Production deploys use this order:

```text
1. Build app
2. Check migrations for obvious destructive SQL
3. Apply production D1 migrations
4. Deploy Worker
```

This works safely when migrations are additive or backward-compatible, such as
creating tables, adding nullable columns, or creating indexes. Avoid automatic
destructive migrations such as dropping tables, dropping columns, truncating
data, or renaming tables/columns.

For breaking schema changes, use expand/contract:

```text
Deploy A: add the new shape and support both old and new writes
Deploy B: read from the new shape
Deploy C: remove the old shape after it is no longer used
```

`scripts/check-migrations-safe.sh` blocks obvious destructive SQL. A manually
approved exceptional deploy can set `ALLOW_DESTRUCTIVE_MIGRATIONS=1`, but that
should not be the default path.

## Manual Deploys

Manual deploys are for debugging, not normal release flow:

```bash
pnpm wrangler login
pnpm deploy
```

Prefer reviewed PRs and the GitHub-connected deploy path for production.

## Smoke Checks

After a preview or production deploy, verify the public and auth entry routes:

```bash
SMOKE_BASE_URL=https://senex.nz pnpm smoke:deploy
```

For a local check, start the app separately and point the smoke script at it:

```bash
pnpm dev
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke:deploy
```

The script follows redirects and fails loudly on non-2xx responses or missing
expected page content.
