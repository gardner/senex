# EPIC-12: Observability And Release

Goal: prepare controlled releases with privacy-respecting observability and
clear release gates.

Source: [PLAN observability](../docs/PLAN.md#18-observability-and-product-telemetry),
[PLAN release plan](../docs/PLAN.md#19-release-plan).

## E12-T01 Define telemetry boundaries

Status: Done

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

Notes:

- Added [docs/telemetry.md](../docs/telemetry.md) with the split between
  product analytics and cognitive test data, per-mode rules, allowed
  engineering event categories, forbidden payloads, destinations, and review
  checklist.
- Added `tests/telemetry-boundaries.test.ts` to keep the boundary committed,
  verify Worker observability is documented as operational service telemetry,
  and guard Offline Mode against browser analytics transports by default.
- Reviewed the boundary against the PRD privacy principles, Anonymous Reporting
  consent model, local-data docs, and current Cloudflare Workers observability
  docs.

## E12-T02 Implement engineering telemetry

Status: Done

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

Notes:

- Added `lib/telemetry.ts` with the `engineering-telemetry-v1` event contract,
  strict detail allowlisting, coarse failure classification, and non-blocking
  capture wrapper.
- Wired capture for app render errors, failed JSON import preview/restore,
  failed anonymous reporting upload submit, failed account-sync load/submit,
  hidden-tab task interruptions, local schema migration success/failure, and
  app/schema version adoption.
- Added `tests/telemetry-events.test.ts` for payload filtering, sensitive-field
  rejection, coarse error classification, and non-blocking sink failure
  behavior.
- Current telemetry dispatches only a local browser event by default; Offline
  Mode still emits no analytics network requests.

## E12-T03 Build internal cognitive data observability

Status: Done

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

Notes:

- Confirmed the existing admin-only `/admin/data-quality` and
  `/api/admin/data-quality` surfaces cover completion rates, invalid trial
  rates, quality flag frequency, median task duration, drop-off by test,
  device/input distribution, missing questionnaire fields, and upload retry
  state from accepted anonymous reporting payloads.
- Added explicit privacy guardrails to the dashboard response: aggregate-only
  status, minimum cohort threshold, external-release status, and small-cell
  suppression counts.
- Added small-cell suppression for rare device/input context distribution labels
  so unusual browser/device values are grouped before display or API return.
- Covered the guardrails with `tests/admin-data-quality-privacy.test.ts`,
  expanded `tests/admin-data-quality-api.test.ts`, and added visible Playwright
  assertions in `tests/browser/admin-data-quality.spec.ts`.

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
