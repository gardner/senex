# EPIC-09: Accounts And Sync

Goal: add signed-in continuity without undermining local-first execution or
anonymous-reporting consent boundaries.

Source: [PLAN Phase 4](../docs/PLAN.md#7-phase-4--signed-in-mode),
[PLAN Epic 16](../docs/PLAN.md#epic-16--accounts).

## E09-T01 Build signed-in account profile

Status: Done

Scope:

- Use existing Better Auth sign-up, sign-in, sign-out, and password reset
  foundation.
- Add account profile page.
- Show account export/delete entry points.

Acceptance criteria:

- Signed-in user can view and update basic profile fields.
- Account state is not treated as research consent.

Validation:

- Existing auth tests remain green.
- Browser smoke test for profile route.

Implementation notes:

- Added protected `/account` route with Better Auth `requireUser()` gating.
- Added `AccountProfileForm` for Better Auth `name` and `image` updates.
- Added disabled export/delete entry points until account sync and deletion
  flows exist.
- Account profile copy explicitly keeps account state separate from research
  consent.
- Added desktop/mobile Playwright coverage for signed-in profile update and
  signed-out redirect.
- Fixed auth form hydration guards so pre-hydration input/click races do not
  drop controlled field values or submit natively.
- Split `buttonVariants` into a server-safe module and made the interactive
  `Button` wrapper a client component.

Dependencies: none.

## E09-T02 Define server account sync schema

Status: Done

Scope:

- Define server records for synced sessions, task runs, trial events, scores,
  consent events, and sync state.
- Add migrations.

Acceptance criteria:

- Schema preserves original local IDs and timestamps.
- Sync records are append/merge oriented, not destructive overwrite.
- Migrations pass the destructive migration guard.

Validation:

- D1 migration tests.

Implementation notes:

- Added additive D1 migration `0004_account_sync.sql`.
- Added account sync batch/state tables.
- Added append-oriented account sync tables for sessions, task runs, trial
  events, scores, and consent events.
- Preserved local record IDs, source timestamps, source schema/app versions, and
  per-record hashes for idempotency/conflict detection.
- Added D1 schema tests that verify required columns, duplicate rejection for
  same `user_id + local_id + record_hash`, and preservation of same-local-ID
  conflicting records.

Dependencies: `E02-T02`.

## E09-T03 Implement account sync API

Status: Done

Scope:

- Add authenticated sync endpoint.
- Validate payload schema.
- Return sync state.
- Handle duplicate submissions idempotently.

Acceptance criteria:

- Unauthenticated requests fail.
- User can only sync to their own account.
- Duplicate sync does not duplicate records.

Validation:

- Worker integration tests with real D1.

Implementation notes:

- Added `POST /api/account/sessions/sync`.
- Authenticates with Better Auth request headers before parsing trusted account
  ownership.
- Validates account sync payload shape, local record validators, and
  session/task/score/consent relationships.
- Stores batches and local records idempotently using the account sync schema.
- Returns `syncState` with last batch and pending conflict count.
- Added real D1 integration coverage for unauthenticated requests, mismatched
  account IDs, accepted sync, and duplicate sync.

Dependencies: `E09-T02`.

## E09-T04 Implement local-to-account migration flow

Status: Todo

Scope:

- Add confirmation UI for importing local history into account.
- Let users keep local-only copy.
- Do not share past history for research unless separately consented.

Acceptance criteria:

- No local history uploads without explicit confirmation.
- Consent question for research sharing is separate from account sync.

Validation:

- Browser test for confirmation and cancellation.

Dependencies: `E09-T03`, `E07-T03`.

## E09-T05 Implement anonymous-to-account linking

Status: Todo

Scope:

- Add explicit confirmation before linking anonymous history to account
  identity.
- Explain re-identification implications.
- Preserve anonymous reporting consent history.

Acceptance criteria:

- Anonymous identity is never linked silently.
- User can decline linking and still create/use account.

Validation:

- Integration test for accepted and declined linking.

Dependencies: `E09-T04`, `E07-T04`.

## E09-T06 Implement account export and deletion request

Status: Todo

Scope:

- Add account export endpoint.
- Add account deletion or deletion-request flow.
- Represent what can and cannot be removed from already shared research data.

Acceptance criteria:

- Export includes account-linked history and consent records.
- Deletion path is clear and auditable.

Validation:

- Integration tests for export and deletion request.

Dependencies: `E09-T03`.
