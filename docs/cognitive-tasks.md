# Cognitive Tasks

Senex task modules live in `lib/cognitive-tasks/`. They provide versioned task
definitions, deterministic stimulus generation, and scoring helpers that remain
independent of React and Cloudflare bindings.

These modules are product scaffolding, not validated diagnostic instruments.
User-facing copy must keep the PRD framing: Senex tracks personal cognitive
performance trends over time and must not diagnose or imply clinical certainty.

## Current Scope

The first implemented vertical slice is **Reaction Time Sprint**:

- task definition v1
- seeded random-delay trial schedule
- scoring for median RT, RT variability, anticipations, lapses, no responses,
  valid trial count, and fatigue slope
- quality flags that reduce confidence
- local IndexedDB persistence through `LocalSession`, `TaskRunRecord`,
  `TrialEventRecord`, and `ScoreRecord`
- browser happy-path coverage through the public task battery panel

The remaining task modules currently provide deterministic definitions,
stimulus generation, scoring foundations, local demo persistence, and dashboard
presentation:

- **Symbol Match**: seeded symbol choices, speed/accuracy scoring
- **Arrow Focus**: balanced congruent/incongruent trials, conflict-cost scoring
- **Sequence Tap**: seeded tile sequences, span/error/missed scoring
- **Pair Learning**: versioned pair packs, immediate/delayed/recognition scoring
- **Seven-Day Learning Week**: repeated pack schedule, missed-day handling, and
  learning/retention metrics

The task battery panel can save a deterministic full demo battery covering all
P0 modules. This writes normal `LocalSession`, `TaskRunRecord`,
`TrialEventRecord`, and `ScoreRecord` rows for every task, then refreshes the
offline dashboard so processing, working-memory, and learning cards are filled
from local score history.

Future work should replace the compact demo capture with full timed interactive
runners for each non-reaction task before making research claims from those
modules.

## Research Anchors

Implementation choices are intentionally simple but align with common task
families:

- NIH Toolbox processing-speed tasks use speeded matching or quick same/not-same
  judgments, which informs Symbol Match
  ([NIH Toolbox Processing Speed](https://nihtoolbox.org/domain/processing-speed/)).
- Arrow Focus follows the flanker-task pattern of congruent and incongruent
  trials with response-time conflict cost
  ([arrow flanker paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC7884358/)).
- Sequence Tap follows the Corsi-style span pattern of reproducing a sequence
  and recording the longest reliable span
  ([eCorsi implementation paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC4151195/)).

These anchors guide structure only. Senex must validate its own tasks before
making stronger claims.

## Persistence Rules

Task runs must store:

- `taskId`
- `taskVersion`
- `stimulusPackId`
- `stimulusSeed`
- trial events
- summary metrics
- quality flags

Scoring helpers must never emit `NaN` or infinite numbers. Empty or
insufficient-data runs use explicit finite fallback metrics plus quality flags
or result states so JSON backup/export remains valid.

## Tests

- `tests/cognitive-tasks.test.ts` covers task definitions, deterministic
  stimulus generation, scoring, full demo battery construction, and JSON-safe
  edge cases.
- `tests/browser/cognitive-tasks.spec.ts` covers the Reaction Time Sprint demo,
  full demo battery persistence, dashboard-card refresh, and real browser
  IndexedDB records.
- `tests/test-engine-runner-scoring.test.ts` covers the reusable engine scorer,
  including insufficient-data JSON safety.
