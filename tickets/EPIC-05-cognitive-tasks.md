# EPIC-05: Cognitive Tasks

Goal: implement the cognitive task battery incrementally, starting with one
end-to-end vertical slice.

Source: [PLAN test modules](../docs/PLAN.md#12-test-module-implementation-detail),
[PLAN Epics 5-10](../docs/PLAN.md#epic-5--reaction-time-sprint).

## E05-T01 Implement Reaction Time Sprint vertical slice

Status: Done

Scope:

- Define task v1.
- Implement practice trials and 20-40 real trials.
- Implement random delay stimulus schedule.
- Capture keyboard, mouse, and touch responses.
- Score median RT, variability, anticipations, lapses, valid trial count, and
  fatigue slope.

Acceptance criteria:

- Results persist locally with task version and stimulus seed.
- Quality flags affect score confidence.
- Completion summary and dashboard card exist.
- Export/import round trip includes the task data.

Validation:

- Golden scoring tests.
- Runner integration test.
- Browser happy path.

Implementation notes:

- `lib/cognitive-tasks/reaction-time.ts` implements deterministic trial
  generation and JSON-safe scoring.
- `components/cognitive-task-panel.tsx` persists the current demo run into
  browser IndexedDB with task version, stimulus seed, trial events, quality
  flags, and median-RT score.

Dependencies: `E02-T05`, `E03-T02`, `E04-T06`.

## E05-T02 Implement Symbol Match

Status: In progress

Scope:

- Define task v1.
- Generate seeded symbol key and trial sequence.
- Capture speeded matching responses.
- Score speed, accuracy, and valid-trial count.

Acceptance criteria:

- Same seed produces same trial sequence.
- Alternate seeds produce valid alternate forms.
- Dashboard card exists.

Validation:

- Stimulus generation tests.
- Scoring tests.
- Runner integration test.

Dependencies: `E05-T01`.

Implementation notes:

- Deterministic v1 definition, stimulus generation, and scoring are implemented
  in `lib/cognitive-tasks/symbol-match.ts`.
- Full demo-battery local persistence and dashboard presentation are
  implemented. Full timed interactive runner capture remains.

## E05-T03 Implement Arrow Focus

Status: In progress

Scope:

- Define task v1.
- Generate balanced congruent and incongruent trials.
- Capture keyboard and touch left/right responses.
- Score accuracy, median RT, and conflict cost.

Acceptance criteria:

- Trial balance is deterministic by seed.
- Conflict-cost scoring handles low valid-trial counts conservatively.
- Dashboard card exists.

Validation:

- Stimulus generation tests.
- Scoring tests.

Dependencies: `E05-T01`.

Implementation notes:

- Deterministic v1 definition, balanced congruent/incongruent generation, and
  conflict-cost scoring are implemented in
  `lib/cognitive-tasks/arrow-focus.ts`.
- Full demo-battery local persistence and dashboard presentation are
  implemented. Full timed keyboard/touch runner capture remains.

## E05-T04 Implement Sequence Tap

Status: In progress

Scope:

- Define task v1.
- Display tile sequences.
- Capture replay responses.
- Score span, errors, and completion state.

Acceptance criteria:

- Keyboard and touch operation both work.
- Sequence generation is deterministic by seed.
- Missed or abandoned responses are stored explicitly.

Validation:

- Sequence generation tests.
- Scoring tests.
- Accessibility smoke test.

Dependencies: `E04-T04`.

Implementation notes:

- Deterministic v1 definition, sequence generation, and span/error/missed
  scoring are implemented in `lib/cognitive-tasks/sequence-tap.ts`.
- Full demo-battery local persistence and dashboard presentation are
  implemented. Full interactive keyboard/touch runner capture and accessibility
  smoke coverage remain.

## E05-T05 Implement Pair Learning

Status: In progress

Scope:

- Define item-pair schema.
- Implement learning screen, immediate recall, delayed recall, and recognition.
- Score immediate accuracy, delayed accuracy, recognition accuracy, repeated
  errors, learning slope, and forgetting delta.

Acceptance criteria:

- Item packs are versioned and deterministic.
- Delayed recall timing is represented explicitly.
- Dashboard card exists.

Validation:

- Item pack tests.
- Scoring tests.
- Integration test for complete learning flow.

Dependencies: `E05-T04`.

Implementation notes:

- Versioned deterministic pair packs and immediate/delayed/recognition scoring
  are implemented in `lib/cognitive-tasks/pair-learning.ts`.
- Full demo-battery local persistence and dashboard presentation are
  implemented. Full learning screen and delayed recall timing UI remain.

## E05-T06 Implement Seven-Day Learning Week

Status: In progress

Scope:

- Define monthly pack logic.
- Repeat pack across 7 days.
- Handle missed days.
- Score learning curve and retention.

Acceptance criteria:

- Missed-day behavior is deterministic and documented.
- Monthly summary report exists.
- Export/import preserves repeated-pack continuity.

Validation:

- Schedule tests.
- Learning-curve scoring tests.
- Import/export continuity test.

Dependencies: `E05-T05`, `E06-T04`.

Implementation notes:

- Deterministic repeated-pack schedule generation, missed-day handling, and
  learning/retention scoring are implemented in
  `lib/cognitive-tasks/seven-day-learning.ts`.
- Full demo-battery local persistence and dashboard presentation are
  implemented. Monthly summary UI and export/import continuity coverage remain.
