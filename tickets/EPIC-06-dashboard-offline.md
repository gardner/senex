# EPIC-06: Dashboard And Offline Onboarding

Goal: make Offline Mode usable, understandable, and safe before adding upload
or account features.

Source: [PLAN offline dashboard](../docs/PLAN.md#44-offline-dashboard),
[PLAN Epics 11-12](../docs/PLAN.md#epic-11--dashboard).

## E06-T01 Build mode chooser and offline explanation

Status: Todo

Scope:

- Add first-run mode chooser.
- Add "Use privately on this device" path.
- Explain local storage, backup risk, and no automatic upload.

Acceptance criteria:

- User can begin without an account.
- Copy is plain-language and non-frightening.
- Offline data is not uploaded.

Validation:

- Browser test for first-run Offline Mode path.

Dependencies: `E02-T04`.

## E06-T02 Build baseline setup and context questions

Status: Todo

Scope:

- Add minimal onboarding for baseline formation.
- Capture optional context such as sleep, stress, distraction, and notes.
- Allow prefer-not-to-answer where appropriate.

Acceptance criteria:

- Context is stored locally with session or profile as appropriate.
- User can skip optional context.
- Copy avoids medical claims.

Validation:

- Integration test for saving context.

Dependencies: `E06-T01`, `E02-T05`.

## E06-T03 Build dashboard baseline status

Status: Todo

Scope:

- Show today's test status.
- Show baseline state: not started, forming, usable, stable, or needs
  recalibration.
- Show last 7/30 days completion.

Acceptance criteria:

- Baseline-forming state appears until threshold is met.
- Dashboard handles no data, partial data, and low-quality data.

Validation:

- Component tests or browser tests for dashboard states.

Dependencies: `E04-T06`.

## E06-T04 Build domain cards and trend views

Status: Todo

Scope:

- Add cards for reaction speed, attention/processing, memory, and learning as
  tasks become available.
- Show personal-baseline comparisons and trend uncertainty.

Acceptance criteria:

- No population norms are shown in v1.
- Low-quality or insufficient data does not produce definitive claims.
- Quality explanations are visible.

Validation:

- Tests for insufficient-data and low-quality states.

Dependencies: `E06-T03`, `E05-T01`.

## E06-T05 Add local data controls

Status: Todo

Scope:

- Add export entry point.
- Add import entry point.
- Add delete-local-data flow.
- Add backup reminder.

Acceptance criteria:

- Delete flow requires explicit confirmation.
- Export/import links to the implemented flows.
- Backup reminder does not create alarmist copy.

Validation:

- Browser test for delete confirmation and cancellation.

Dependencies: `E03-T04`, `E02-T06`.
