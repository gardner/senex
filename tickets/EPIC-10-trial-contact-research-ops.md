# EPIC-10: Trial Contact And Research Ops

Goal: support trial-contact opt-in and controlled research operations without
creating a public researcher portal in v1.

Source: [PLAN trial contact](../docs/PLAN.md#75-trial-contact-registry),
[PLAN Phase 5](../docs/PLAN.md#8-phase-5--research-operations-and-admin-tooling).

## E10-T01 Implement trial-contact consent flow

Status: Done

Scope:

- Add a signed-in-only trial-contact checkbox flow.
- Keep trial contact separate from general research sharing.
- Store opt-in timestamp, consent version, and review timestamp.

Acceptance criteria:

- Anonymous Reporting users cannot be contacted for trials.
- Copy states that trial contact is not study enrolment.
- User can opt out at any time.

Validation:

- Browser test for opt in and opt out.

Implementation:

- Added D1 tables `trial_contact_status` and
  `trial_contact_consent_events`.
- Added `GET /api/account/trial-contact` and
  `POST /api/account/trial-contact`.
- Added the `/account` trial-contact panel with opt-in and opt-out controls.
- Added API and browser coverage in `tests/trial-contact-api.test.ts` and
  `tests/browser/trial-contact.spec.ts`.

Dependencies: `E09-T01`, `E07-T01`.

## E10-T02 Add trial-contact profile fields

Status: Todo

Scope:

- Add contact preferences and optional eligibility questions.
- Keep sensitive trial-contact data separate from general research exports.

Acceptance criteria:

- Contact data requires signed-in account.
- Contact preferences are auditable and reversible.

Validation:

- D1 migration tests.
- Integration test for preference updates.

Dependencies: `E10-T01`, `E08-T01`.

## E10-T03 Build ingestion status view

Status: Todo

Scope:

- Add internal admin view for anonymous reporting submissions.
- Show ingestion status, failures, retry state, and schema versions.

Acceptance criteria:

- Admin route is protected.
- No unnecessary identifiers are shown.
- Failures are actionable.

Validation:

- Authz tests for admin-only access.

Dependencies: `E07-T06`, `E09-T01`.

## E10-T04 Build data quality dashboard

Status: Todo

Scope:

- Show completion rates, invalid trial rates, quality flag frequency, median
  task duration, drop-off by test, device/input distribution, and missing
  questionnaire fields.

Acceptance criteria:

- Dashboard uses aggregate operational views.
- No personal data is shown unless explicitly needed for internal support.

Validation:

- Integration tests for aggregate queries.

Dependencies: `E10-T03`, `E12-T02`.

## E10-T05 Implement research export job and manifest

Status: Todo

Scope:

- Add controlled export job.
- Filter by consent, date range, study, and withdrawal/exclusion status.
- Generate export manifest with schema versions and included categories.

Acceptance criteria:

- Export excludes withdrawn users where feasible.
- Export manifest is stored.
- No direct contact data is included unless a trial workflow specifically
  allows it.

Validation:

- Export tests with consent and withdrawal fixtures.

Dependencies: `E10-T04`, `E07-T06`.

## E10-T06 Add withdrawal and exclusion tooling

Status: Todo

Scope:

- Add internal tooling to mark future exclusion from research datasets.
- Preserve audit records.
- Represent limits of deleting already aggregated or published research output.

Acceptance criteria:

- Exclusion affects future export jobs.
- Audit trail records who changed exclusion state and why.

Validation:

- Integration test for export exclusion.

Dependencies: `E10-T05`.
