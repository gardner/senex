# EPIC-06: Dashboard And Offline Onboarding

Goal: make Offline Mode usable, understandable, and safe before adding upload
or account features.

Source: [PLAN offline dashboard](../docs/PLAN.md#44-offline-dashboard),
[PLAN Epics 11-12](../docs/PLAN.md#epic-11--dashboard).

## E06-T01 Build mode chooser and offline explanation

Status: Done

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

Implementation notes:

- `components/offline-mode-panel.tsx` provides the mode chooser and local-only
  explanation.
- `tests/browser/offline-mode.spec.ts` verifies the first-run private path does
  not POST to app APIs.

Dependencies: `E02-T04`.

## E06-T02 Build baseline setup and context questions

Status: Done

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

Implementation notes:

- Optional baseline context is stored as local questionnaire answers with
  `questionnaireId: "baseline_setup_v1"`.
- `listQuestionnaireAnswers()` exposes local answer verification without using
  test-only repository helpers.

Dependencies: `E06-T01`, `E02-T05`.

## E06-T03 Build dashboard baseline status

Status: Done

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

Implementation notes:

- `lib/offline-dashboard.ts` computes today status, baseline state, and 7/30
  day completion from local sessions and scores.
- `tests/offline-dashboard.test.ts` covers empty and usable baseline states.

Dependencies: `E04-T06`.

## E06-T04 Build domain cards and trend views

Status: Done

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

Implementation notes:

- The offline dashboard renders conservative domain cards without population
  norms.
- Reaction speed uses local `median_rt_ms` scores; other cards wait for their
  interactive task runners.

Dependencies: `E06-T03`, `E05-T01`.

## E06-T05 Add local data controls

Status: Done

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

Implementation notes:

- The offline panel links to the JSON backup card, preserves the persistent
  storage request path, and implements delete cancel/confirm behavior.
- `tests/browser/offline-mode.spec.ts` covers delete cancellation and confirmed
  deletion.

Dependencies: `E03-T04`, `E02-T06`.
