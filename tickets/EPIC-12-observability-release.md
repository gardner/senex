# EPIC-12: Observability And Release

Goal: prepare controlled releases with privacy-respecting observability and
clear release gates.

Source: [PLAN observability](../docs/PLAN.md#18-observability-and-product-telemetry),
[PLAN release plan](../docs/PLAN.md#19-release-plan).

## E12-T01 Define telemetry boundaries

Status: Todo

Scope:

- Document the split between product analytics and cognitive test data.
- Define what engineering telemetry is allowed in Offline, Anonymous Reporting,
  and Signed-In modes.

Acceptance criteria:

- Offline Mode has no analytics or only strictly opt-in analytics.
- Telemetry never includes raw cognitive test data or sensitive answers unless
  explicitly consented and governed.

Validation:

- Docs reviewed against PRD privacy principles.

Dependencies: `E07-T01`.

## E12-T02 Implement engineering telemetry

Status: Todo

Scope:

- Capture app errors, failed imports, failed uploads, failed syncs, test abort
  reasons, version adoption, and schema migration failures.

Acceptance criteria:

- Events are minimal and privacy-safe.
- Offline Mode does not send telemetry by default.
- Telemetry failures never block local test completion.

Validation:

- Unit tests for telemetry payload filtering.

Dependencies: `E12-T01`, `E03-T05`, `E07-T05`.

## E12-T03 Build internal cognitive data observability

Status: Todo

Scope:

- Build aggregate dashboards for completion rates, invalid trial rates, quality
  flag frequency, task duration, drop-off, device/input distribution, missing
  questionnaire fields, and upload retry rates.

Acceptance criteria:

- Dashboard is aggregate-first.
- Small-cell and re-identification risks are considered.

Validation:

- Query tests with fixture data.

Dependencies: `E10-T04`, `E12-T01`.

## E12-T04 Define release gates

Status: Todo

Scope:

- Convert Release 0.1 through 1.0 into checklists.
- Include quality, accessibility, privacy/security, deployment, and data
  migration gates.

Acceptance criteria:

- Each release has explicit must-pass checks.
- Release 1.0 includes privacy review and clinical-claim boundary review.

Validation:

- Release checklist reviewed by product and engineering.

Dependencies: `E11-T03`, `E11-T04`, `E11-T06`.

## E12-T05 Create release notes process

Status: Todo

Scope:

- Add a lightweight release notes template.
- Include product behavior changes, migration notes, consent/data-sharing
  changes, and known limitations.

Acceptance criteria:

- Ticket definition of done points to release notes when user-visible behavior
  changes.
- Release notes avoid unsupported medical claims.

Validation:

- Template committed and linked from README or docs.

Dependencies: `E12-T04`.
