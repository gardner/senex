# JSON Export And Import

Senex JSON backups are user-owned Offline Mode files. They are generated and
restored in the browser; generating a backup does not upload local history.

## Envelope

Current export schema version: `1`.

The envelope format is `senex.local-backup` and includes:

- export metadata: `exportId`, `exportedAt`, `exportSchemaVersion`,
  `localSchemaVersion`, and `appVersion`
- source metadata: app name, origin, and whether full trial events were included
- local records: profiles, sessions, task runs, trial events, scores,
  questionnaire answers, consent records, and import audit records
- stimulus references derived from task runs

Unknown future export or local schema versions are rejected. Malformed JSON and
invalid nested local records fail before any local write is attempted.

## Export

`createLocalExportEnvelope()` reads the IndexedDB stores and returns a validated
backup envelope. `downloadLocalExportEnvelope()` serializes that envelope as
pretty-printed JSON and creates a browser Blob download URL.

Trial events are included by default. Callers can pass
`{ includeTrialEvents: false }` when a summary-only backup is needed.

## Import Preview

`previewLocalImportText()` parses JSON, validates the envelope, and returns a
summary with record counts, session date range, duplicate session count, and
current local impact. Preview does not write to IndexedDB.

The public page shows this preview before merge or replace actions. Replace
shows explicit destructive-copy warning text.

## Restore

`restoreLocalExportEnvelope()` supports:

- `merge`: upserts records by stable IndexedDB keys, deduplicating repeated
  imports by ID
- `replace`: clears local data stores before restoring the backup

Both modes write an `ImportAuditRecord`. Restore writes run in one IndexedDB
transaction so an aborted or failed import leaves prior local data intact.

Imported data is never uploaded automatically. Account sync and research upload
remain separate consent-gated flows.

Signed-in account export is separate from this local backup format. Account
exports include trial-contact preferences in a distinct `trialContact` block so
optional contact details are not mixed into synced history records or general
research data.

## Tests

- `tests/export-schema.test.ts` validates the envelope schema and corrupt/future
  version rejection.
- `tests/browser/export-import.spec.ts` exercises export generation, import
  preview, merge, replace, duplicate merge, and rollback behavior in Chromium.
