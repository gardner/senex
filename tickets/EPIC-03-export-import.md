# EPIC-03: Export Import

Goal: give users a reliable, user-owned JSON backup and restore path.

Source: [PLAN JSON export/import](../docs/PLAN.md#43-json-exportimport),
[PLAN Epic 3](../docs/PLAN.md#epic-3--json-exportimport).

## E03-T01 Define export schema v1

Status: Done

Scope:

- Define the JSON export envelope.
- Include metadata, profile, sessions, task runs, trial events, scores,
  questionnaire answers, consent records, and stimulus references.
- Decide how schema versions and app versions are represented.

Acceptance criteria:

- Export schema is documented.
- Schema validation exists for the envelope.
- Exported consent records and timestamps are preserved.

Validation:

- Unit tests for valid and invalid export envelopes.

Dependencies: `E02-T02`.

## E03-T02 Implement JSON export

Status: Done

Scope:

- Add export generation from local storage.
- Include optional full trial-level data where available.
- Download a JSON file in the browser.

Acceptance criteria:

- Export includes all locally stored categories defined by schema v1.
- Export never uploads data.
- Empty-state export is handled clearly.

Validation:

- Integration test exports a known local history fixture.
- Browser test downloads or inspects generated export content.

Dependencies: `E03-T01`, `E02-T05`.

## E03-T03 Implement import preview

Status: Done

Scope:

- Let user select a JSON export.
- Validate schema before any write.
- Show import summary: session count, date range, categories, export version,
  and local-data impact.

Acceptance criteria:

- Invalid files are rejected with clear errors.
- No local data is changed before confirmation.
- Unknown future schema versions are rejected or blocked with explicit copy.

Validation:

- Corrupt JSON tests.
- Browser test for preview without write.

Dependencies: `E03-T01`.

## E03-T04 Implement merge and replace restore

Status: Done

Scope:

- Add confirmed merge restore.
- Add confirmed replace restore.
- Preserve original IDs and timestamps.
- Write a local import audit record.

Acceptance criteria:

- Merge deduplicates by stable IDs.
- Replace warns clearly before deleting local history.
- Imported data is never uploaded automatically.

Validation:

- Round-trip export/import test.
- Duplicate-session merge test.
- Replace-flow test.

Dependencies: `E03-T03`, `E02-T03`.

## E03-T05 Harden import failure handling

Status: Done

Scope:

- Handle partial writes, invalid records, unsupported versions, and browser
  storage failures.
- Ensure failures leave existing local data intact.

Acceptance criteria:

- Import is transactional or rollback-safe.
- User sees actionable failure copy.
- Failed import does not mutate existing history.

Validation:

- Tests for malformed records and simulated write failure.

Dependencies: `E03-T04`.
