# EPIC-04: Test Runner And Scoring

Goal: build the reusable engine for cognitive test execution, scoring, quality
flags, baselines, and trends.

Source: [PLAN Phase 2](../docs/PLAN.md#5-phase-2--test-engine-and-scoring-platform),
[PLAN Epic 4](../docs/PLAN.md#epic-4--test-runner).

## E04-T01 Define task definition contract

Status: Done

Scope:

- Define a versioned task definition format.
- Include task id, task version, domain, cadence, estimated duration,
  instructions, practice trials, stimulus rules, trial count, response types,
  scoring rules, quality rules, and accessibility notes.

Acceptance criteria:

- Contract is represented in TypeScript.
- Contract preserves historical meaning when tasks evolve.
- Invalid task definitions fail validation.

Validation:

- Unit tests for valid and invalid definitions.

Dependencies: none.

## E04-T02 Build test runner state machine

Status: Done

Scope:

- Model setup, instructions, practice, ready, running trial, between trials,
  paused/interrupted, completed, saved, and abandoned states.
- Keep runner logic independent of UI components.

Acceptance criteria:

- Invalid state transitions are rejected.
- Interrupted runs can be saved or abandoned explicitly.
- Runner exposes enough state for accessible UI.

Validation:

- State machine unit tests.

Dependencies: `E04-T01`.

## E04-T03 Build timing and input utilities

Status: Done

Scope:

- Use `performance.now()` for trial timing.
- Add keyboard, mouse, and touch input abstraction.
- Capture visibility change, focus loss, and input method metadata.

Acceptance criteria:

- All timestamps are monotonic.
- Negative or impossible reaction times are rejected.
- Visibility and focus interruptions produce quality flags.

Validation:

- Timing sanity tests.
- Browser test for tab visibility interruption where feasible.

Dependencies: `E04-T02`.

## E04-T04 Implement quality flag engine

Status: Done

Scope:

- Implement trial-level, task-run-level, and session-level quality flags.
- Include anticipations, lapses, no response, multiple responses, hidden tab,
  blur, input/device change, and self-reported context flags.

Acceptance criteria:

- Flags are structured and stored with the relevant entity.
- Scoring can exclude or downgrade flagged data.
- User-facing explanations avoid blame or clinical overclaiming.

Validation:

- Unit tests for each P0 quality flag.

Dependencies: `E04-T03`, `E02-T05`.

## E04-T05 Implement scoring result contract

Status: Done

Scope:

- Define raw metrics, domain metrics, quality flags, confidence score, and
  human-readable result states.
- Add versioned scoring metadata.

Acceptance criteria:

- Scores are deterministic for the same task run.
- Scoring version is stored with score outputs.
- Low-quality inputs downgrade confidence instead of pretending certainty.

Validation:

- Golden fixture tests.

Dependencies: `E04-T04`.

## E04-T06 Implement baseline and trend engines

Status: Done

Scope:

- Implement baseline states: not started, forming, usable, stable, and needs
  recalibration.
- Add 7-day and 30-day summaries.
- Compare against personal baseline only.

Acceptance criteria:

- First session alone never creates a definitive baseline.
- Poor-quality sessions do not dominate baseline.
- Trend output has explicit uncertainty states.

Validation:

- Unit tests for baseline thresholds and quality weighting.

Dependencies: `E04-T05`, `E02-T05`.
