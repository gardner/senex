# Local Data Platform

Senex stores Offline Mode history in browser IndexedDB before any optional
reporting or account sync. The local data layer lives in `lib/local/`.

## Schema

Current local schema version: `2`.

Durable record types:

- `LocalProfile`
- `LocalSession`
- `TaskRunRecord`
- `TrialEventRecord`
- `ScoreRecord`
- `QuestionnaireAnswerRecord`
- `ConsentRecord`
- `AnonymousIdentityRecord`
- `ReportingUploadRecord`
- `ImportAuditRecord`

Each durable record includes stable IDs, `schemaVersion`, `appVersion`, and the
timestamps needed for export/import and audit trails.

## IndexedDB Stores

The `senex-local` database currently has these stores:

- `profiles`
- `sessions`
- `taskRuns`
- `trialEvents`
- `scores`
- `questionnaireAnswers`
- `consentRecords`
- `anonymousIdentities`
- `reportingUploads`
- `importAudits`
- `metadata`

The metadata store tracks `schemaVersion` and `lastSavedAt`. Future schema
changes must add explicit migration code and tests.

## Migrations

`runLocalMigrations()` opens the database, creates stores when needed, and
migrates known older local schema metadata to the current version. The v2
migration adds anonymous reporting identity/upload stores and stamps legacy
records to the current schema version. If metadata claims a future local schema
version, the app throws instead of trying to downgrade or discard user data.

Restore writes use a single IndexedDB transaction across data stores and the
metadata store. If import validation or a write fails, the transaction aborts
and previous local history remains intact.

## Testing

Schema validators are covered by Vitest in `tests/local-schema.test.ts`.
IndexedDB repository behavior is covered by Playwright in
`tests/browser/local-data.spec.ts`, which runs in Chromium against the real
browser IndexedDB implementation.

Browser test screenshots are written under `test-results/`, which is ignored by
Git.

## UI

`components/offline-mode-panel.tsx` shows whether local history exists, the
last local save time, first-run private mode, optional baseline context,
dashboard status, persistent-storage request state, and delete-local-history
controls. Persistent storage requests are non-blocking because browsers may
deny or ignore them.

`components/backup-restore-panel.tsx` provides JSON backup generation, import
preview, merge restore, and replace restore. See
[export-import.md](export-import.md).

`components/cognitive-task-panel.tsx` currently provides the Reaction Time
Sprint demo path. It creates a local session, stores a versioned task run,
stores trial events, stores the median-RT score, and then completes the
session. See [cognitive-tasks.md](cognitive-tasks.md).

The first-run Offline Mode flow and dashboard are documented in
[offline-mode.md](offline-mode.md).

Anonymous reporting consent, identity, payload, and queue records are documented
in [anonymous-reporting.md](anonymous-reporting.md).
