# Anonymous Reporting

Anonymous reporting lets a local-only user contribute selected research data
without creating an account. It is opt-in, category based, and explicit: the app
builds a payload preview locally, then queues an upload only when the user asks.

## Consent Model

Consent records are stored in IndexedDB as append-only `ConsentRecord` entries
with:

- category in `consentType`
- `decision`: `granted`, `denied`, or `withdrawn`
- terms version
- source screen
- app and schema version
- timestamp

The current consent terms version is `anonymous-reporting-v1`.

Categories:

- test summaries
- trial-level data
- session context
- demographics
- questionnaires
- longitudinal research use
- approved partner access

Missing consent is treated as not uploadable.

## Anonymous Identity

The browser stores an `AnonymousIdentityRecord` with a random `study_*` ID. The
ID is shown in the reporting dashboard and remains stable across local sessions.
Users can pause reporting, resume it, or stop future sharing. Stopping reporting
withdraws every reporting category but leaves Offline Mode available.

## Payloads And Queue

`buildAnonymousReportingPayload()` derives the active consent snapshot and only
adds data for granted categories. Test summaries deliberately exclude raw trial
events and session context. Trial events, context, demographics, and
questionnaires each require their own category.

Queued uploads are stored as `ReportingUploadRecord` entries with the payload,
consent snapshot, included categories, status, and idempotency key. Uploading is
not automatic.

## Server Ingestion

`POST /api/reporting/anonymous/submit` validates that payload categories are
covered by the consent snapshot before writing to D1. Accepted submissions are
stored in `anonymous_research_submissions`; duplicate idempotency keys return a
success response without creating another submission. Ingestion events are
recorded in `anonymous_research_submission_audit`.

The D1 migration is additive:

- `migrations/0002_anonymous_reporting.sql`
- `migrations/0003_anonymous_reporting_records.sql`

Future deletion or exclusion workflows should build on the
`deletion_request_status` field and audit table rather than mutating historical
submissions in place.
