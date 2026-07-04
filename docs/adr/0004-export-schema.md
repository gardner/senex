# ADR-0004: Export Schema Governance

Status: Accepted

Date: 2026-07-04

## Context

Offline Mode requires user-owned JSON export/import. Exports are also a trust
surface: users need a portable backup, and future reporting or account
migration must not silently reinterpret historical data.

Unversioned JSON would be difficult to migrate and risky to import.

## Decision

Create a versioned export envelope for all user-owned JSON backups. The envelope
contains export metadata, schema version, app version, profile records, session
records, task run records, trial event records when selected, questionnaire
answers, consent records, and source metadata.

Imports validate the envelope before writing data. Older supported versions are
migrated through explicit migration functions. Unknown future versions fail
loudly.

## Consequences

Export schema changes require review, fixtures, and import tests. The app must
preserve enough provenance to explain where imported records came from.

Research exports should use a separate reviewed manifest, not the private
backup envelope directly.
