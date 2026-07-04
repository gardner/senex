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
- `account_deletion_requests`: one auditable account deletion review request per
  open user request, including the server-side scope and limitations shown to
  the user.
- `account_export_audit`: append-only account export audit metadata. It records
  export generation events, export version, timestamp, source, and per-section
  record counts without duplicating the exported personal data.

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

Anonymous reporting history has an additional explicit linking gate. The
browser records accepted or declined linking decisions as local
`anonymous_account_link` consent events before the account sync payload builder
will include anonymous reporting history. Those events are stored in
`account_sync_consent_events` with the rest of the consent history when the user
later confirms import.

Anonymous reporting ingestion stores accepted uploads append-only in
`anonymous_research_submissions` and normalized child rows in
`anonymous_research_submission_records`. Validation failures are kept in
`anonymous_research_ingestion_failures` as operational metadata only: schema
versions, category count, retry state, validation error, and action text. The
failure table intentionally omits raw payloads, anonymous study IDs, and raw
idempotency keys.

`research_exports` stores completed admin research export manifests. It records
the export id, creating admin user id, purpose, approval reference, filter JSON,
requested category JSON, exported submission/record counts, exclusion count,
and manifest JSON. The table does not store the returned dataset. The export
job reads only anonymous reporting tables, applies consent/date/study filters,
excludes submissions with a non-`none` `deletion_request_status`, and writes
hashed study-filter and subject/submission keys instead of raw anonymous study
IDs or idempotency keys.

`GET /api/account/export` returns an `account-export-v1` JSON document for the
signed-in account. It includes account profile fields, sync state, sync batches,
account-linked sessions/task runs/trial events/scores, account-linked consent
events, trial-contact settings/profile data in a separate `trialContact` block,
deletion requests, and retention notes.

Each successful account export also writes one `account_export_audit` row.
Unauthenticated export requests are rejected before audit records are written.

`POST /api/account/deletion-requests` creates or returns the current open
account deletion request. It does not immediately delete records. The request
scope covers account profile and account-linked sync tables; already shared
research submissions require review or exclusion handling, and local browser
storage must be deleted on the device.

## Trial Contact Schema

Trial contact is a signed-in account setting, not Anonymous Reporting consent
and not study enrolment. Anonymous Reporting users have no trial-contact write
path because they do not have account contact details.

The current terms version is `trial-contact-v1`.
The current profile version is `trial-contact-profile-v1`.

- `trial_contact_status`: one current preference row per signed-in user,
  including whether contact is enabled, the consent version, opt-in timestamp,
  opt-out timestamp, last reviewed timestamp, and update timestamp.
- `trial_contact_consent_events`: append-only opt-in/opt-out decisions with the
  signed-in user id, version, decision timestamp, and source.
- `trial_contact_profiles`: one current optional profile per signed-in user,
  including preferred contact method, country/region, coarse age eligibility,
  broad health answers, availability preference, profile version, and review
  timestamp.
- `trial_contact_profile_events`: append-only profile update and clear events.
  These events keep trial-contact profile history auditable without mixing it
  into account sync or anonymous reporting tables.

`GET /api/account/trial-contact` returns the current signed-in user's
trial-contact status and profile. Missing rows return explicit disabled/empty
defaults with the current versions and null timestamps.

`POST /api/account/trial-contact` accepts an optional `enabled` boolean and an
optional `profile` object; at least one must be present. When `enabled` is
present, the endpoint writes an append-only consent decision and updates the
current status row. When `profile` is present, the endpoint writes an
append-only profile event and replaces the current profile. Posting an empty
profile records a `cleared` event, so profile preferences are reversible.
Opting out preserves the original opt-in timestamp and records a new opt-out
timestamp so the audit trail remains understandable.
