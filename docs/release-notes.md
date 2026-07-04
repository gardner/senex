# Release Notes Process

Scope: E12-T05 lightweight release notes process for Senex releases and
user-visible product changes.

Release notes are product-facing evidence, not a git log. GitHub automatically
generated release notes can provide the merged-PR inventory, but the final notes
must be edited into plain language that explains behavior changes, data changes,
migration impact, consent/data-sharing changes, and known limitations.

References:

- [Release gates](release-gates.md)
- [Copy safety](copy-safety.md)
- [Deployment](deployment.md)
- [GitHub automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
- [Keep a Changelog](https://keepachangelog.com/en/0.3.0/)
- [FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)

## When Notes Are Required

Create or update release notes when a change:

- changes user-visible product behavior or copy
- changes onboarding, dashboard, account, reporting, trial-contact, export, or
  import workflows
- changes local or remote data shape, migration behavior, retention, deletion,
  backup, or restore behavior
- changes consent, data-sharing, research export, or trial-contact boundaries
- changes known limitations, support expectations, or release audience
- adds security, privacy, accessibility, or clinical-claim review outcomes that
  users, testers, or operators need to know

## Workflow

1. Start from [docs/releases/TEMPLATE.md](releases/TEMPLATE.md).
2. Use the matching [release-gates.md](release-gates.md) checklist to decide
   which verification evidence belongs in the notes.
3. Group entries by user impact, not by commit order.
4. Keep medical, wellness, and cognitive-performance wording inside the boundary
   in [copy-safety.md](copy-safety.md).
5. Link migrations and deployment notes only when they affect operators,
   testers, user data, or rollback.
6. Store release notes under `docs/releases/` for named releases.

## Claim Safety

Release notes must avoid unsupported medical claims. Do not imply that Senex
diagnoses, screens for, predicts, detects, treats, mitigates, or prevents a
disease or condition. Do not introduce brain-age, dementia-risk,
normal/abnormal, clinical-grade, or urgent-care language unless a future
clinical/regulatory review explicitly approves that release surface.

Allowed framing:

- local-first cognitive performance tracking
- personal baseline and trend wording
- not diagnostic
- optional research or trial-contact participation, clearly separated from
  product results

If release notes need to mention health-related context, run the
[copy-safety.md](copy-safety.md) checklist and document the reviewer in the
notes.

## Template

Use [docs/releases/TEMPLATE.md](releases/TEMPLATE.md) for the canonical
template. Keep individual release notes concise; if a section does not apply,
write `None`.
