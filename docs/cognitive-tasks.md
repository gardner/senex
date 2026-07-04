# Cognitive Tasks

Senex task modules live in `lib/cognitive-tasks/`. They provide versioned task
definitions, deterministic stimulus generation, and scoring helpers that remain
independent of React and Cloudflare bindings.

These modules are product scaffolding, not validated diagnostic instruments.
User-facing copy must keep the PRD framing: Senex tracks personal cognitive
performance trends over time and must not diagnose or imply clinical certainty.

## Current Scope

The first implemented vertical slices are **Reaction Time Sprint**, **Symbol
Match**, **Arrow Focus**, **Sequence Tap**, and **Pair Learning**.

Reaction Time Sprint includes:

- task definition v1
- seeded random-delay trial schedule
- scoring for median RT, RT variability, anticipations, lapses, no responses,
  valid trial count, and fatigue slope
- quality flags that reduce confidence
- local IndexedDB persistence through `LocalSession`, `TaskRunRecord`,
  `TrialEventRecord`, and `ScoreRecord`
- browser happy-path coverage through the public task battery panel

Symbol Match includes:

- task definition v1
- seeded symbol choice generation
- speed/accuracy scoring
- compact interactive capture through pointer input and number keys
- local IndexedDB persistence with task version, stimulus seed, trial events,
  and score rows
- browser coverage on desktop and mobile Chromium

Arrow Focus includes:

- task definition v1
- balanced congruent/incongruent flanker-style trial generation
- accuracy, median RT, and conflict-cost scoring
- compact interactive capture through left/right arrow keys and pointer/touch
  buttons
- local IndexedDB persistence with task version, stimulus seed, trial events,
  and score rows
- browser coverage on desktop and mobile Chromium

Sequence Tap includes:

- task definition v1
- seeded spatial sequence generation
- span, error, and missed-response scoring
- compact interactive capture through number keys and pointer/touch tile
  buttons
- explicit missed-response storage
- local IndexedDB persistence with task version, stimulus seed, trial events,
  and score rows
- browser coverage on desktop and mobile Chromium

Pair Learning includes:

- task definition v1
- versioned deterministic pair packs
- immediate recall, delayed recall, and recognition scoring
- compact interactive capture through pointer/touch choices
- explicit delayed-recall timing marker in persisted trial stimuli
- local IndexedDB persistence with task version, stimulus seed, phase-tagged
  trial events, and score rows
- browser coverage on desktop and mobile Chromium

The remaining task module currently provides deterministic definitions,
stimulus generation, scoring foundations, local demo persistence, and dashboard
presentation:

- **Seven-Day Learning Week**: repeated pack schedule, missed-day handling, and
  learning/retention metrics

The task battery panel can save a deterministic full demo battery covering all
P0 modules. This writes normal `LocalSession`, `TaskRunRecord`,
`TrialEventRecord`, and `ScoreRecord` rows for every task, then refreshes the
offline dashboard so processing, working-memory, and learning cards are filled
from local score history.

Future work should replace compact demo capture with a full timed interactive
runner for Seven-Day Learning, and validate all task flows before making
research claims from those modules.

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
  Symbol Match keyboard/pointer capture, Arrow Focus keyboard/touch capture,
  full demo battery persistence, dashboard-card refresh, and real browser
  IndexedDB records.
- `tests/browser/cognitive-sequence-tap.spec.ts` covers Sequence Tap keyboard,
  pointer/touch, and explicit missed-response persistence.
- `tests/browser/cognitive-pair-learning.spec.ts` covers Pair Learning study,
  immediate recall, delayed recall, recognition, and persisted phase/timing
  metadata.
- `tests/test-engine-runner-scoring.test.ts` covers the reusable engine scorer,
  including insufficient-data JSON safety.
