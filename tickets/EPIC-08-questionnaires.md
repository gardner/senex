# EPIC-08: Questionnaires

Goal: collect structured context and research answers without hard-coding every
form.

Source: [PLAN questionnaires](../docs/PLAN.md#63-research-questionnaires),
[PLAN Epic 15](../docs/PLAN.md#epic-15--questionnaires).

## E08-T01 Define questionnaire schema

Status: Todo

Scope:

- Define questionnaire id, version, question metadata, sensitivity,
  visibility, required-for-reporting, and required-for-trial-contact fields.
- Support single choice, multi choice, number, short text, scale, date/year,
  and prefer-not-to-say.

Acceptance criteria:

- Schema is versioned.
- Prefer-not-to-say is first-class.
- Sensitive questions are marked.

Validation:

- Schema validation tests.

Dependencies: `E02-T02`.

## E08-T02 Build question renderer

Status: Todo

Scope:

- Render each supported question type.
- Persist answers locally.
- Support editing answers while preserving versioned answer history where
  required.

Acceptance criteria:

- Renderer is accessible by keyboard.
- Validation errors are clear.
- Optional questions can be skipped.

Validation:

- Component/browser tests for each question type.

Dependencies: `E08-T01`.

## E08-T03 Implement demographics questionnaire

Status: Todo

Scope:

- Add P0 demographics questions with coarse fields where possible.
- Include answer visibility and research purpose copy.

Acceptance criteria:

- User understands whether an answer is shared.
- Sensitive combinations are treated as pseudonymous research data, not
  impossible anonymity.

Validation:

- Browser test for completion and skip states.

Dependencies: `E08-T02`, `E07-T01`.

## E08-T04 Implement session context questionnaire

Status: Todo

Scope:

- Capture sleep, stress, distraction, illness, medication/substance context,
  and notes where appropriate.
- Attach answers to the session.

Acceptance criteria:

- Context can quality-flag a session without invalidating it by default.
- User can skip optional context.

Validation:

- Integration test for session context and quality flags.

Dependencies: `E08-T02`, `E04-T04`.

## E08-T05 Add research profile completion state

Status: Todo

Scope:

- Track completion of demographics, device familiarity, baseline sleep/stress,
  cognitive concerns, and general health context.
- Show completion state in reporting dashboard.

Acceptance criteria:

- Completion state is version-aware.
- Missing optional fields are not treated as errors.

Validation:

- Unit tests for completion state.

Dependencies: `E08-T03`, `E08-T04`.
