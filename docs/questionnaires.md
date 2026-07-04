# Questionnaires

Senex uses a small questionnaire engine instead of hard-coded one-off forms.
Definitions live in `lib/questionnaires/` and are rendered by
`components/questionnaires/questionnaire-form.tsx`.

## Schema

Questionnaire definitions include:

- `questionnaireId`
- `version`
- `title`
- `purpose`
- `active`
- versioned question metadata

Supported question types:

- `single_choice`
- `multi_choice`
- `number`
- `text_short`
- `scale`
- `date_or_year`

Every question carries sensitivity, answer visibility, research purpose,
required-for-reporting, required-for-trial-contact, and
prefer-not-to-say metadata. Prefer-not-to-say is stored as
`answerStatus: "prefer_not_to_say"` rather than being hidden in free text.

## Local Answers

Local answer records are schema v3 `QuestionnaireAnswerRecord` entries. They
include questionnaire version, question version, answer status, source screen,
and timestamp. Saving an edited questionnaire creates new answer rows, so answer
history is preserved. Completion logic derives the latest answer per
questionnaire/question/session.

## P0 Questionnaires

Implemented now:

- demographics
- session context

Tracked in research profile completion:

- demographics
- device familiarity
- sleep/stress baseline
- cognitive concerns
- general health context

The additional profile sections are tracked as versioned definitions so the
completion dashboard can show them as not started until their forms are exposed.

## Session Context

Session context answers attach to the latest local session when available and
update that session's `contextSnapshot.session_context_v1`. Self-reported poor
sleep, high stress, illness, sedating medicine, and distraction add explicit
quality flags without invalidating the session.

## Accessibility

The renderer uses native form controls: inputs, selects, checkboxes, buttons,
labels, fieldsets, and legends. This keeps keyboard operation aligned with WCAG
keyboard guidance and avoids custom control behavior.
