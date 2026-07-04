# ADR-0001: Local-First Architecture

Status: Accepted

Date: 2026-07-04

## Context

The PRD requires Offline Mode with no login, no server account, and no automatic
upload. The implementation plan says every test session is created, scored, and
stored locally before it can be exported, reported anonymously, or synced to an
account.

Starting with account sync would make the signed-in path the reference
implementation and risk treating offline use as a degraded mode. The product
promise is the opposite: private local use must be the foundation.

## Decision

Senex is local-first. Test sessions, task runs, trial events, scores,
baselines, quality flags, and local consent state are created locally first.

Server features are optional layers:

- Anonymous reporting uploads only the categories covered by active consent.
- Signed-in sync reconciles local records with account records.
- Research exports derive from consented uploads or account data, not from
  hidden collection in Offline Mode.

## Consequences

Offline Mode can be built and tested before accounts, reporting, or admin tools.
The domain layer must not depend on Better Auth, D1, or Cloudflare-only APIs.

Every upload or sync path needs an explicit consent boundary. Import/export and
deduplication become first-class product work, not a later utility.
