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

Status: Done

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

Notes:

- Existing browser coverage already exercised the complete private-mode session
  path and JSON export/import generation, preview, merge, replace, duplicate
  merge, and rollback behavior across desktop and mobile Chromium.
- Added `tests/browser/critical-flows.spec.ts` for true browser-network-off
  private task completion, anonymous-reporting consent withdrawal, and hidden-tab
  interruption persistence.
- Added a shared interactive-task interruption recorder so hidden-tab
  interruptions persist as `tab_hidden` quality flags on the session, task run,
  and scores.

## E11-T03 Run accessibility baseline audit

Status: Done

Scope:

- Audit keyboard navigation, focus states, touch targets, screen reader labels,
  color contrast, large text, and reduced motion.

Acceptance criteria:

- P0 issues are fixed or ticketed.
- Test runner can be completed without pointer input where applicable.

Validation:

- Accessibility report added to docs or release notes.

Dependencies: `E05-T01`, `E06-T03`.

Notes:

- Added [docs/accessibility-audit.md](../docs/accessibility-audit.md) with the
  baseline method, sources, evidence, findings, and release gate.
- Added `tests/browser/accessibility.spec.ts` for axe checks across public/auth
  routes, visible keyboard focus, reduced-motion handling, and keyboard-only
  Symbol Match / Arrow Focus completion.
- Added a global reduced-motion CSS rule for `prefers-reduced-motion: reduce`.
- No P0 accessibility blockers were found in this baseline.

## E11-T04 Implement security P0 controls

Status: Done

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

Notes:

- Added `account_export_audit` in
  `migrations/0009_account_export_audit.sql` and now write an append-only audit
  metadata row for every successful signed-in account export.
- Expanded `tests/account-export-deletion-api.test.ts` and
  `tests/account-sync-schema.test.ts` to verify export audit logging, account
  scoping, and the committed D1 schema.
- Existing security coverage verifies anonymous-reporting consent bypass
  rejection, auth on account APIs, admin-only ingestion status, and separated
  trial-contact profile storage.
- `tests/browser/critical-flows.spec.ts` verifies private/offline task
  completion does not POST to same-origin API routes.

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

Status: Done

Scope:

- Review all user-facing results, notifications, and dashboards.
- Block diagnostic, disease-risk, brain-age, or unsupported certainty language.

Acceptance criteria:

- Allowed and forbidden language list exists.
- Routine result copy uses personal-baseline and sustained-change language.

Validation:

- Copy review checklist completed.

Dependencies: `E06-T04`, `E05-T03`.

Notes:

- Added [docs/copy-safety.md](../docs/copy-safety.md) with the clinical-claim
  boundary, allowed/forbidden language list, review checklist, source
  references, and current review notes.
- Added `tests/copy-safety.test.ts` to keep the checklist committed, scan
  routine user-facing result/dashboard copy for forbidden claim language, and
  assert personal-baseline / local-history result wording.
- Reviewed routine dashboard, task battery, questionnaire, and trial-contact
  copy. No P0 clinical-claim blockers were found.
