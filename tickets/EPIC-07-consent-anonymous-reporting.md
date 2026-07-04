# EPIC-07: Consent And Anonymous Reporting

Goal: add opt-in research contribution without accounts, while preserving
explicit consent boundaries.

Source: [PLAN Phase 3](../docs/PLAN.md#6-phase-3--anonymous-reporting-mode),
[PLAN Epics 13-14](../docs/PLAN.md#epic-13--consent-platform).

## E07-T01 Implement consent terms and category model

Status: Todo

Scope:

- Define consent terms versions.
- Define consent categories for test summaries, trial-level data, session
  context, demographics, questionnaires, longitudinal use, and approved partner
  access.
- Store consent decisions locally.

Acceptance criteria:

- Consent records include category, decision, terms version, source screen,
  app version, and timestamp.
- Consent state is separate from account state.
- Consent history is append-only.

Validation:

- Unit tests for consent state transitions.

Dependencies: `E02-T02`.

## E07-T02 Build consent UI and history

Status: Todo

Scope:

- Add consent center UI.
- Show active consent categories.
- Show consent history.
- Allow stopping future sharing.

Acceptance criteria:

- Consent UI is not a single modal gate.
- User can review what is currently active.
- Withdrawal creates a new consent event.

Validation:

- Browser test for granting and withdrawing consent.

Dependencies: `E07-T01`.

## E07-T03 Implement consent gating utilities

Status: Todo

Scope:

- Add utilities that compute uploadable data from local data and consent state.
- Prevent categories not covered by consent from entering payloads.

Acceptance criteria:

- Upload builder cannot include unconsented categories.
- Tests cover every consent category.
- Missing consent defaults to not uploadable.

Validation:

- Unit tests for consent matrix.

Dependencies: `E07-T01`, `E03-T01`.

## E07-T04 Implement anonymous study identity

Status: Todo

Scope:

- Generate random anonymous study ID.
- Show ID to the user.
- Support copy/export, reset/start fresh, pause reporting, and stop reporting.

Acceptance criteria:

- ID is stable across local sessions.
- Reset warns about trend continuity.
- Stopping reporting keeps local use available.

Validation:

- Integration test for anonymous identity lifecycle.

Dependencies: `E07-T02`.

## E07-T05 Build anonymous reporting payload and upload queue

Status: Todo

Scope:

- Build inspectable payload categories.
- Support share-from-today, selected date range, and all existing history.
- Queue uploads for retry.

Acceptance criteria:

- Payload includes consent snapshot.
- Uploads are explicit user actions.
- Retries are idempotent.

Validation:

- Unit tests for payload builder.
- Integration test for retry/idempotency keys.

Dependencies: `E07-T03`, `E07-T04`.

## E07-T06 Implement server ingestion endpoint

Status: Todo

Scope:

- Add append-only anonymous ingestion endpoint.
- Validate payload schema and consent snapshot.
- Store raw submission envelope and normalized records.
- Keep ingestion audit trail.

Acceptance criteria:

- Data categories not covered by consent are rejected.
- Duplicate submissions are idempotent.
- Future deletion/exclusion request hooks are represented.

Validation:

- Worker integration tests with real D1.

Dependencies: `E07-T05`.

## E07-T07 Build anonymous reporting dashboard

Status: Todo

Scope:

- Show anonymous ID, reporting status, consent categories, last upload, sessions
  contributed, demographics completion, and pause/stop controls.

Acceptance criteria:

- Dashboard distinguishes local history from contributed data.
- Stop/pause controls are clear and reversible where appropriate.

Validation:

- Browser test for reporting dashboard states.

Dependencies: `E07-T06`, `E08-T03`.
