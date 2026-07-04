# ADR-0005: Consent Ledger Model

Status: Accepted

Date: 2026-07-04

## Context

The PRD requires specific, reversible consent across Offline Mode, Anonymous
Reporting Mode, and Signed-In Mode. Consent affects what can be uploaded,
synced, exported for research, or used for trial contact.

Only storing the current consent state would lose the context needed to explain
past submissions.

## Decision

Model consent as an append-only ledger of consent records/events. Each record
stores the consent type, versioned copy or policy reference, choice, timestamp,
mode, subject identifier, and data categories covered.

Derived "current consent" views may be cached for UI and validation, but source
records are superseded rather than overwritten.

## Consequences

Upload APIs must include or derive a consent snapshot and reject data categories
outside that snapshot. Withdrawal prevents future sharing but does not erase
already-exported research datasets unless a specific study process requires it.

Offline Mode still keeps local consent records so future migration to reporting
or signed-in mode can preserve user intent.
