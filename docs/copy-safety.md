# Copy Safety Review

Date: 2026-07-05

Scope: E11-T06 review of user-facing result, notification, dashboard,
questionnaire, and trial-contact copy. Senex remains a personal cognitive
performance tracking tool, not a diagnostic, screening, or disease-risk product.

## Reference Boundary

- FDA General Wellness guidance distinguishes low-risk wellness software from
  software intended for diagnosis, cure, mitigation, prevention, or treatment of
  disease or conditions.
- FTC Health Products Compliance Guidance requires health-related product claims
  to be truthful, not misleading, and backed by adequate substantiation.
- Medsafe notes that a medical device can be regulated when a sponsor claims or
  implies a therapeutic purpose.
- The Senex PRD prohibits dementia, Alzheimer, disease-risk, brain-age,
  diagnosis, screening, and unsupported urgency language until validated and
  reviewed through the appropriate clinical, ethical, and regulatory path.

References:

- [FDA General Wellness: Policy for Low Risk Devices](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices)
- [FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)
- [Medsafe medical device regulatory guidance](https://www.medsafe.govt.nz/regulatory/devicesnew/industry.asp)
- [Medsafe glossary: therapeutic purpose](https://www.medsafe.govt.nz/regulatory/DevicesNew/3-1Glossary.asp)
- [Senex PRD safety and clinical positioning](PRD.md#14-safety-and-clinical-positioning)

## Allowed Language

Routine results may use:

- personal baseline
- baseline forming
- compared only with your own local history
- recent trend needs more sessions
- outside your usual range, only when enough valid repeated sessions support it
- worth discussing with a qualified health professional, only for sustained
  concerns and never as an urgent instruction
- not diagnostic / not a diagnostic instrument, as a negative disclaimer
- self-reported concern, condition, or trial-contact eligibility language when
  clearly framed as optional user-provided context

Trial-contact copy may mention research studies or clinical trials because that
flow is an account opt-in for being contacted; it must continue to say trial
contact is not study enrolment.

## Forbidden Language

Routine product copy must not use:

- diagnose, diagnosis, diagnostic assessment, screening, detection, detected
- dementia risk, Alzheimer warning, ADHD risk, concussion risk, depression risk
- disease-risk prediction or disease labels in routine result summaries
- brain age
- normal, abnormal, normal range, impaired, deficient, or clinical-grade
- decline detected
- medical urgency, such as seek urgent care because a score changed
- unsupported certainty, such as proven, validates, confirms, predicts, or
  identifies a condition

These terms can appear in internal docs or PRD examples when explicitly listed
as forbidden language. They should not appear in routine user-facing result
copy.

## Copy Review Checklist

- Home page states that Senex is local-first and non-diagnostic.
- Quick-check task copy says results stay local and tasks are not medical
  tests.
- Offline dashboard uses personal-baseline and local-history language.
- Domain cards avoid population norms, normal/abnormal labels, and disease
  labels.
- Questionnaire copy frames health or concern fields as self-reported research
  context.
- Trial-contact copy says contact is not study enrolment and remains separate
  from Anonymous Reporting.
- Account export/deletion copy describes data scope and limitations without
  implying clinical interpretation.
- Automated copy guard passes in `tests/copy-safety.test.ts`.

## Current Review Notes

No P0 clinical-claim blockers were found in the audited routine UI copy.

Allowed narrow contexts found:

- `not diagnostic` appears as a negative disclaimer for task scaffolds.
- `without diagnostic claims` appears in questionnaire-purpose copy.
- `Diagnosed cognitive condition` appears only as an optional self-reported
  trial-contact profile answer, not as a system result or claim.

Future changes that add result language, push/email notifications, release
notes, marketing pages, population norms, or health-professional prompts must
rerun this checklist in the same PR.
