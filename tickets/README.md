# Senex Ticket Backlog

This folder turns [docs/PLAN.md](../docs/PLAN.md) into implementation work that
can be assigned to the team.

## How To Use This Backlog

- Keep one pull request focused on one ticket where possible.
- Use TDD for implementation tickets: write the failing test first, make it
  pass, then refactor.
- Keep Offline Mode and local-first data integrity ahead of account, research,
  and admin work.
- Do not upload or sync any user data before the relevant consent ticket is
  complete.
- Update the matching docs when behavior changes.

## Ticket Statuses

- `Todo`: ready to pick up after dependencies are complete.
- `Blocked`: cannot start without a decision or dependency.
- `In progress`: actively being implemented.
- `Review`: implementation complete, awaiting review.
- `Done`: merged and verified.

## Epics

| Epic | File                                                                        | PLAN coverage               |
| ---- | --------------------------------------------------------------------------- | --------------------------- |
| E01  | [Foundation](EPIC-01-foundation.md)                                         | Phase 0, Epic 1             |
| E02  | [Local Data Platform](EPIC-02-local-data-platform.md)                       | Phase 1, Epic 2             |
| E03  | [Export Import](EPIC-03-export-import.md)                                   | Phase 1, Epic 3             |
| E04  | [Test Runner And Scoring](EPIC-04-test-runner-scoring.md)                   | Phase 2, Epic 4             |
| E05  | [Cognitive Tasks](EPIC-05-cognitive-tasks.md)                               | Epics 5-10                  |
| E06  | [Dashboard And Offline Onboarding](EPIC-06-dashboard-offline.md)            | Epics 11-12                 |
| E07  | [Consent And Anonymous Reporting](EPIC-07-consent-anonymous-reporting.md)   | Phase 3, Epics 13-14        |
| E08  | [Questionnaires](EPIC-08-questionnaires.md)                                 | Epic 15                     |
| E09  | [Accounts And Sync](EPIC-09-accounts-sync.md)                               | Phase 4, Epic 16            |
| E10  | [Trial Contact And Research Ops](EPIC-10-trial-contact-research-ops.md)     | Phase 5, Epics 17-18        |
| E11  | [Quality Accessibility Security](EPIC-11-quality-accessibility-security.md) | Sections 15-17, Epics 19-20 |
| E12  | [Observability And Release](EPIC-12-observability-release.md)               | Sections 18-19              |

## Suggested First Sprint

1. `E01-T01` Validate vinext/Workers deployment.
2. `E01-T02` Add browser test harness.
3. `E02-T01` Decide and document local DB adapter.
4. `E02-T02` Implement local schema v1.
5. `E04-T01` Define task definition contract.
6. `E04-T02` Build test runner state machine.
7. `E05-T01` Implement Reaction Time Sprint vertical slice.

## Definition Of Done

Every ticket should satisfy the relevant criteria from
[docs/PLAN.md#22-definition-of-done](../docs/PLAN.md#22-definition-of-done).

At minimum:

- Tests cover the new behavior.
- Error, empty, loading, and interruption states are handled where relevant.
- Accessibility is considered for user-facing work.
- Export/import and consent behavior are defined when data leaves the device.
- Documentation is updated when product or operational behavior changes.
- The release notes are updated from [docs/release-notes.md](../docs/release-notes.md)
  when user-visible behavior, data movement, consent/data-sharing, migrations,
  known limitations, or claim-safety boundaries change.
