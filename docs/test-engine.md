# Test Engine And Scoring

Senex cognitive tasks use framework-independent engine modules under
`lib/test-engine/`. React components render instructions and collect input, but
task meaning, quality rules, scoring, and baseline logic live in versioned
TypeScript contracts.

## Task Definitions

`TaskDefinition` includes:

- stable `taskId` and semantic `taskVersion`
- domain, cadence, estimated duration, instructions, and practice settings
- seeded or fixed stimulus rules
- response modes and valid response windows
- scoring version, primary metric, and metric list
- quality thresholds for anticipations, lapses, valid trial counts, and lapse
  rate
- accessibility input alternatives and notes

`assertTaskDefinition()` validates definitions at load time. Historical task
runs must store the `taskId`, `taskVersion`, stimulus seed, and scoring version
used for the run.

## Runner

The runner state machine is UI-independent. Supported states are `setup`,
`instructions`, `practice`, `ready`, `running_trial`, `between_trials`,
`paused`, `interrupted`, `completed`, `saved`, and `abandoned`.

Invalid transitions throw. Interrupted runs can be explicitly saved or
abandoned, and every state exposes accessible status text for UI rendering.

## Timing And Input

Timing utilities use monotonic browser timing (`performance.now()` in UI code)
and reject impossible negative reaction times. Pointer input helpers retain
mouse, pen, touch, or generic pointer metadata.

Visibility changes are represented as task-run quality flags so hidden-tab
interruptions can downgrade confidence.

## Quality Flags

Quality flags are structured records with `code`, `level`, `severity`, and
`excludeFromScoring`. Current P0 flags cover anticipations, lapses, no response,
multiple responses, too few valid trials, high lapse rate, and tab visibility.

User-facing copy should describe data quality neutrally; quality flags are not
clinical judgments.

## Scoring And Baselines

`scoreReactionTimeRun()` produces deterministic raw metrics, scoring version,
quality flag references, confidence, and result state. Low-quality runs
downgrade confidence instead of presenting unsupported certainty.

Baseline logic compares against personal data only. One session never creates a
definitive baseline; the engine reports `forming`, `usable`, `stable`, or
`needs_recalibration` based on usable sample count and confidence.

Trend summaries currently expose 7-day and 30-day windows with explicit
`insufficient_data`, `usable`, or `low_confidence` states.

## Tests

- `tests/test-engine-task-definition.test.ts` covers definition validation.
- `tests/test-engine-runner-scoring.test.ts` covers runner transitions, timing,
  quality flags, scoring, baselines, and trends.
- `tests/browser/test-engine.spec.ts` covers browser monotonic timing and
  visibility metadata.
