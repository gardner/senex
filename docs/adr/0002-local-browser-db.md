# ADR-0002: Local Browser Database

Status: Accepted

Date: 2026-07-04

## Context

Senex needs durable browser storage for longitudinal cognitive data. The data is
relational enough to include sessions, task runs, trial events, questionnaire
answers, consent records, and export metadata. It also needs local import,
merge, and deletion behavior.

`localStorage` is too small and too coarse for this shape. D1 is appropriate for
server account records, but Offline Mode must work without a network or account.

## Decision

Use IndexedDB as the browser persistence backend for local product data. Build a
small repository layer around it so domain code does not call IndexedDB
directly.

D1 remains the server relational database for auth, account sync, consent
submissions, and reporting metadata. Local schemas and server schemas may share
entity names, but local storage is the source of truth for Offline Mode.

## Consequences

The first local data tickets should define migrations, repository contracts,
and exportable record shapes before adding more cognitive tasks.

Tests should exercise repository behavior in a real browser or browser-like
storage environment. Account sync must be an adapter over local records, not a
replacement for them.
