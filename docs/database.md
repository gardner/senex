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

## Account Sync Schema

Account sync tables are additive and append-oriented. They preserve locally
generated IDs, original timestamps, source schema/app versions, and a
`record_hash` for each synced local record. Duplicate uploads use unique
`user_id + local_*_id + record_hash` indexes, while a same local ID with a
different hash can be stored for later conflict handling.

The core tables are:

- `account_sync_batches`: one accepted, duplicate, conflict, or rejected upload
  attempt per user/idempotency key.
- `account_sync_state`: per-account sync cursor, last batch, and pending
  conflict count.
- `account_sync_sessions`, `account_sync_task_runs`,
  `account_sync_trial_events`, `account_sync_scores`: account-linked copies of
  local test history.
- `account_sync_consent_events`: account-linked consent history; consent events
  stay append-only and separate from account profile state.

Do not treat local deletion as server deletion in these tables. Account data
removal belongs in the explicit export/deletion-request flow.

`POST /api/account/sessions/sync` is the signed-in write path for these tables.
The endpoint authenticates with Better Auth, rejects payloads for a different
`accountId`, validates local record shape and relationships, writes records with
`INSERT OR IGNORE`, and returns the account sync state. Repeating the same
idempotency key returns the existing batch without duplicating records.

The `/account` page is the first client entry point for this endpoint. It shows
local IndexedDB counts, requires a confirmation checkbox before upload, keeps
the local browser copy, and keeps research sharing separate from account sync.
