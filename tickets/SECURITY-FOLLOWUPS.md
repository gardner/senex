# Security Follow-Up Tickets

Source: [E11-T05 threat model](../docs/threat-model.md).

These follow-ups are the workshop outputs for risks that need product, security,
or governance work beyond the current implementation. `Release Blocker: yes`
blocks the named release surface until resolved, downgraded with written
rationale, or descoped from that release.

## SEC-E11-01 Backup Reminder Cadence And Copy

Threat model: Offline Data Loss

State: Backlog
Release Blocker: no

Scope:

- Decide whether post-baseline Offline Mode should remind users to export a JSON
  backup.
- Draft copy that is clear about local-device loss without implying cloud sync.

## SEC-E11-02 Research Export Small-Cell Review Checklist

Threat model: Anonymous Re-Identification; Research Export Misuse

State: Release-gated
Release Blocker: yes for external partner exports

Scope:

- Define minimum cohort and subgroup sizes for external dataset release.
- Define suppression or bucketing rules for rare questionnaire/device/context
  combinations.
- Require sign-off before any partner receives a dataset.

## SEC-E11-03 Partner Export Approval Log

Threat model: Anonymous Re-Identification; Research Export Misuse

State: Release-gated
Release Blocker: yes for external partner exports

Scope:

- Record who approved each partner export, the approval reference, categories,
  release destination, and conditions.
- Link approval log entries to stored export manifests.

## SEC-E11-04 Route Consent Matrix Registry

Threat model: Consent Bypass

State: Backlog
Release Blocker: no

Scope:

- Maintain a compact matrix of routes, data categories, consent source, and
  server-side enforcement function.
- Add the matrix to docs or test fixtures so new data movement routes are
  reviewable.

## SEC-E11-05 PR Checklist For New Data Movement Routes

Threat model: Consent Bypass

State: Backlog
Release Blocker: no

Scope:

- Update PR/review guidance so any route that moves local, account, anonymous
  research, export, or contact data names its consent gate and tests.

## SEC-E11-06 Auth Rate-Limit And Lockout Plan

Threat model: Account Takeover

State: Backlog
Release Blocker: no for private MVP; yes before public production launch

Scope:

- Choose rate-limit boundaries for sign-in, sign-up, password reset, and bearer
  token paths.
- Decide lockout or step-up behavior for repeated failures.

## SEC-E11-07 Staff/Admin MFA Requirement

Threat model: Account Takeover

State: Release-gated
Release Blocker: yes before staff/admin production operations

Scope:

- Require stronger authentication for staff/admin accounts before production
  research/admin operations.
- Document recovery and break-glass process.

## SEC-E11-08 Encrypted Backup Decision

Threat model: Offline Data Loss

State: Backlog
Release Blocker: no

Scope:

- Decide whether encrypted JSON backups are required in v1.
- If yes, choose UX, key handling, and recovery copy.

## SEC-E11-09 Trial-Contact Staff Role Separation

Threat model: Trial-Contact Misuse

State: Release-gated
Release Blocker: yes before recruiter workflow

Scope:

- Define which staff roles can view, export, or update trial-contact profiles.
- Keep trial-contact access separate from research export access.

## SEC-E11-10 Trial-Contact Recruiter Export Gate

Threat model: Trial-Contact Misuse

State: Release-gated
Release Blocker: yes before recruiter workflow

Scope:

- Require opt-in, current review timestamp, and opt-out check before any
  recruiter contact list is produced.
- Record an audit event for generated recruiter contact lists.

## SEC-E11-11 User-Visible Import Diff And Checksum Review

Threat model: Corrupt Import File

State: Backlog
Release Blocker: no

Scope:

- Decide whether import preview should show a richer before/after diff.
- Decide whether backup files should include a checksum visible to users.

## SEC-E11-12 Import Failure Copy Review

Threat model: Corrupt Import File

State: Backlog
Release Blocker: no

Scope:

- Review import error copy so nontechnical users understand when no local data
  was changed and what action to take next.

## SEC-E11-13 Import Size Limit And Reserved-Key Guard

Threat model: Malicious JSON Import

State: Backlog
Release Blocker: no

Scope:

- Add a maximum file-size decision before parsing local backup imports.
- Reject reserved object keys such as `__proto__`, `constructor`, and
  `prototype` where structured parsers do not already drop them.

## SEC-E11-14 Malicious Import Fuzz Corpus

Threat model: Malicious JSON Import

State: Backlog
Release Blocker: no

Scope:

- Add fixture files for oversized arrays, prototype-shaped objects, invalid
  relationship graphs, and hostile strings.
- Run the corpus in CI against import preview and restore paths.
