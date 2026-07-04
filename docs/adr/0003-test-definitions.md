# ADR-0003: Test Definition Format

Status: Accepted

Date: 2026-07-04

## Context

Cognitive task behavior must be repeatable across app versions. The plan calls
for versioned test definitions that describe metadata, instructions, stimuli,
trial rules, scoring, practice effects, accessibility notes, and validation
fixtures.

Hard-coding task rules only inside React components would make results hard to
audit, export, or replay.

## Decision

Represent each cognitive task with a versioned TypeScript definition object
checked by a schema at load time. Definitions should include stable IDs,
semantic version, supported input modes, timing rules, trial generation
parameters, scoring references, quality flag rules, and fixture cases.

React components render and collect input. They do not define the authoritative
scoring or eligibility rules.

## Consequences

Task changes require version bumps and regression fixtures. Historical sessions
must keep the task definition ID and version used at run time.

The export schema can include task definition references instead of trying to
infer task meaning from UI routes.
