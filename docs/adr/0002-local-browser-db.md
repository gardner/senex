# ADR-0002: Local Browser Database

Status: Accepted

Date: 2026-07-04

## Context

Senex needs durable browser storage for longitudinal cognitive data. The data is
relational enough to include sessions, task runs, trial events, questionnaire
answers, consent records, and export metadata. It also needs local import,
merge, and deletion behavior.

`localStorage` is too small and too coarse for this shape. D1 is appropriate for
server account records, but Offline Mode must work without a network or account.

## Decision

Use IndexedDB directly as the browser persistence backend for local product
data. Build a small repository layer around it so domain code does not call
IndexedDB directly.

The implementation keeps two versions:

- IndexedDB database version: controls object-store and index upgrades through
  browser `versionchange` transactions.
- Senex local schema version: stored in the metadata store and included on
  durable records and exports.

The v1 object stores are:

- `profiles`
- `sessions`
- `taskRuns`
- `trialEvents`
- `scores`
- `questionnaireAnswers`
- `consentRecords`
- `importAudits`
- `metadata`

Unknown future local schema versions fail loudly rather than trying to open or
downgrade data. Older known schema versions migrate forward through explicit
migration functions.

The browser can be asked for persistent storage, but the request is best-effort.
The UI must still explain that local history is browser-managed and that JSON
exports are the backup path.

D1 remains the server relational database for auth, account sync, consent
submissions, and reporting metadata. Local schemas and server schemas may share
entity names, but local storage is the source of truth for Offline Mode.

## Consequences

The first local data tickets should define migrations, repository contracts,
and exportable record shapes before adding more cognitive tasks.

Pure schema validators are covered by Vitest. Repository and migration behavior
is tested through Playwright in Chromium so core IndexedDB behavior is not
mocked. Account sync must be an adapter over local records, not a replacement
for them.
