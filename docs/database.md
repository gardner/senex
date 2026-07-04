# Database

Senex uses [Cloudflare D1](https://developers.cloudflare.com/d1/) through the
`DB` binding in `wrangler.jsonc`. The same database stores app tables and Better
Auth tables.

## One-Time Cloudflare Setup

Create a D1 database in the target Cloudflare account:

```bash
pnpm wrangler d1 create senex-db
```

Paste the returned `database_id` into `wrangler.jsonc`. The database id is not a
secret and can be committed.

## Migrations

Migration files live in `migrations/` and are applied in filename order.

Apply migrations locally:

```bash
pnpm db:local:migrate
```

Create a new migration:

```bash
pnpm wrangler d1 migrations create senex-db describe_your_change
```

Never edit a migration that has already been applied to a shared environment.
Add a new numbered migration instead.

## Production Migrations

The intended production path is the deploy pipeline:

```bash
pnpm run deploy:prod
```

That script checks for obviously destructive SQL, applies pending remote
migrations to `senex-db`, and then deploys the Worker. Wrangler tracks applied
migrations in `d1_migrations`, so re-running it only applies new files.

Manual remote migration commands exist for first-time setup and debugging, but
they change the real production database:

```bash
pnpm db:remote:migrate
```

Use them deliberately.

## Migration Safety

Automatic production migrations should be backward-compatible:

```sql
CREATE TABLE IF NOT EXISTS consent_events (...);
ALTER TABLE user ADD COLUMN timezone TEXT;
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(userId);
```

Avoid automatic destructive migrations:

```sql
DROP TABLE old_sessions;
ALTER TABLE user DROP COLUMN name;
ALTER TABLE session RENAME COLUMN userId TO subjectId;
```

The deploy path runs:

```bash
pnpm run check:migrations
```

before applying production migrations. The check is intentionally blunt and
should be treated as a prompt for manual review.

## Better Auth Schema

The initial auth migration was generated from Better Auth. If plugins change in
`lib/auth/options.ts`, generate a fresh schema into a temporary file and diff it
against the current migrations:

```bash
pnpm dlx @better-auth/cli@latest generate --config lib/auth/cli.ts --output /tmp/auth-schema.sql --yes
```

`lib/auth/cli.ts` exists because the Better Auth CLI runs in Node and cannot
load the runtime config that imports `cloudflare:workers`.

## Admin Role

The Better Auth admin plugin stores a `role` column on `user`. New sign-ups are
ordinary users. Promote an admin account intentionally:

```bash
pnpm wrangler d1 execute DB --local --command "UPDATE user SET role='admin' WHERE email='you@example.com'"
```

For production, use `--remote` only when you mean to update the live database.
