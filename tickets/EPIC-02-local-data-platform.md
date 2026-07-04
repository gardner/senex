# EPIC-02: Local Data Platform

Goal: make local browser storage the durable source of truth for test sessions.

Source: [PLAN Phase 1](../docs/PLAN.md#4-phase-1--offline-mode-mvp),
[PLAN Epic 2](../docs/PLAN.md#epic-2--local-data-platform).

## E02-T01 Decide local DB adapter

Status: Todo

Scope:

- Choose the browser storage layer and migration strategy.
- Compare IndexedDB wrappers or a direct structured storage approach.
- Record how schema versions are represented.

Acceptance criteria:

- Decision is recorded in an ADR.
- The decision explains backup/export implications.
- The decision includes how tests will run without mocking core behavior.

Validation:

- `pnpm format:check`

Dependencies: `E01-T03`.

## E02-T02 Implement local schema v1

Status: Todo

Scope:

- Define local entities for profile, sessions, task runs, trial events, scores,
  questionnaire answers, consent records, and import audit records.
- Add TypeScript types and schema validation.

Acceptance criteria:

- Schema includes stable IDs, timestamps, app version, and schema version.
- Schema is mode-neutral and supports Offline, Anonymous Reporting, and
  Signed-In Mode.
- Invalid records fail validation loudly.

Validation:

- Unit tests for valid and invalid records.
- `pnpm typecheck`

Dependencies: `E02-T01`.

## E02-T03 Implement local migration runner

Status: Todo

Scope:

- Add a browser-local migration runner for schema changes.
- Track applied local schema version.
- Fail loudly on unknown future schema versions.

Acceptance criteria:

- New local profiles initialize at schema v1.
- Existing data can migrate forward in tests.
- Failed migrations do not silently discard user data.

Validation:

- Migration tests for empty DB, current DB, older DB, and unknown future DB.

Dependencies: `E02-T02`.

## E02-T04 Implement local profile and session persistence

Status: Todo

Scope:

- Create local profile on first use.
- Persist session start/completion records.
- Persist session context and quality flags.

Acceptance criteria:

- Returning users keep the same local profile.
- Incomplete sessions are represented explicitly.
- Session writes are idempotent where possible.

Validation:

- Integration test creates, updates, and reads a session.

Dependencies: `E02-T03`.

## E02-T05 Persist task runs, trial events, and scores

Status: Todo

Scope:

- Add writes and reads for task runs.
- Add writes and reads for trial events.
- Add writes and reads for score records.

Acceptance criteria:

- A task run can store seed, task version, summary score, and quality flags.
- Trial events preserve stimulus, response, correctness, timing, and flags.
- Score records are queryable by session, task, domain, and metric.

Validation:

- Integration test persists a complete task run with trial events and scores.

Dependencies: `E02-T04`, `E04-T01`.

## E02-T06 Add local storage status UI

Status: Todo

Scope:

- Show whether local history exists.
- Show last local save time.
- Warn about browser storage loss.
- Request persistent storage where supported.

Acceptance criteria:

- Offline users can understand whether their data is only local.
- Storage persistence request failures are visible but non-blocking.
- Copy avoids unsupported certainty.

Validation:

- Browser test covers storage status display.

Dependencies: `E02-T04`.
