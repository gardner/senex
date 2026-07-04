# EPIC-11: Quality Accessibility Security

Goal: harden product quality, accessibility, and privacy/security controls.

Source: [PLAN QA](../docs/PLAN.md#15-quality-assurance-plan),
[PLAN security](../docs/PLAN.md#16-security-implementation-plan),
[PLAN accessibility](../docs/PLAN.md#17-accessibility-implementation-plan).

## E11-T01 Expand unit and integration coverage

Status: Done

Scope:

- Cover stimulus generation, scoring, baseline calculation, trend calculation,
  consent gating, JSON import validation, merge/deduplication, and quality flag
  logic.

Acceptance criteria:

- Core domain behavior has deterministic fixtures.
- Tests avoid broad mocks for infrastructure the app depends on.

Validation:

- `pnpm test`

Dependencies: `E04-T06`, `E07-T03`, `E03-T04`.

Notes:

- Added `tests/quality-coverage.test.ts` for deterministic E11 hardening
  coverage across scoring medians, baseline/trend confidence edges,
  quality-flag counting, anonymous reporting category declarations, and local
  backup stimulus-reference integrity.
- Fixed even-count median scoring for Symbol Match and Arrow Focus.
- Fixed task-run quality so multiple exclude flags on one trial only invalidate
  that trial once.
- Strengthened anonymous reporting and local backup validation for metadata
  consistency.

## E11-T02 Add browser coverage for critical flows

Status: Todo

Scope:

- Cover complete offline session.
- Cover export/import.
- Cover Offline Mode network-off behavior.
- Cover visibility interruption.
- Cover consent withdrawal.

Acceptance criteria:

- Browser tests run in CI or are documented as a required release gate.
- Tests cover desktop and at least one mobile viewport.

Validation:

- Browser test command passes.

Dependencies: `E01-T02`, `E06-T05`, `E07-T02`.

## E11-T03 Run accessibility baseline audit

Status: Todo

Scope:

- Audit keyboard navigation, focus states, touch targets, screen reader labels,
  color contrast, large text, and reduced motion.

Acceptance criteria:

- P0 issues are fixed or ticketed.
- Test runner can be completed without pointer input where applicable.

Validation:

- Accessibility report added to docs or release notes.

Dependencies: `E05-T01`, `E06-T03`.

## E11-T04 Implement security P0 controls

Status: Todo

Scope:

- Verify no automatic upload in Offline Mode.
- Verify server-side consent scope validation.
- Verify auth for account APIs.
- Verify least-privilege access for admin/research routes.
- Add export audit logs.

Acceptance criteria:

- Consent bypass tests exist.
- Admin/research routes are protected.
- Sensitive data is separated from trial-contact data.

Validation:

- Security-focused integration tests.

Dependencies: `E07-T06`, `E09-T03`, `E10-T02`.

## E11-T05 Run threat model workshops

Status: Todo

Scope:

- Cover offline data loss, anonymous re-identification, consent bypass, account
  takeover, research export misuse, trial-contact misuse, corrupt import file,
  and malicious JSON import.

Acceptance criteria:

- Each threat model has risks, mitigations, open questions, and follow-up
  tickets.
- High-risk issues block release until addressed.

Validation:

- Threat model notes committed.

Dependencies: `E03-T05`, `E07-T06`, `E10-T05`.

## E11-T06 Clinical-claim and copy safety review

Status: Todo

Scope:

- Review all user-facing results, notifications, and dashboards.
- Block diagnostic, disease-risk, brain-age, or unsupported certainty language.

Acceptance criteria:

- Allowed and forbidden language list exists.
- Routine result copy uses personal-baseline and sustained-change language.

Validation:

- Copy review checklist completed.

Dependencies: `E06-T04`, `E05-T03`.
