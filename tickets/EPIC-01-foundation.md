# EPIC-01: Foundation

Goal: prove the platform assumptions before deep product work begins.

Source: [PLAN Phase 0](../docs/PLAN.md#3-milestone-roadmap),
[PLAN Epic 1](../docs/PLAN.md#epic-1--project-foundation).

## E01-T01 Validate vinext Workers deployment

Status: Todo

Scope:

- Confirm the app builds with `vinext build`.
- Confirm `wrangler.jsonc` deploy shape matches the generated vinext Worker
  shape.
- Document any unsupported Next/vinext APIs discovered during validation.

Acceptance criteria:

- `pnpm build` succeeds.
- `pnpm deploy` is documented as a manual-debug path only.
- Production deployment path remains Cloudflare Workers Builds with
  `pnpm run deploy:prod`.
- A compatibility note is added to `docs/stack.md` for any discovered sharp
  edge.

Validation:

- `pnpm typecheck`
- `pnpm build`
- If Cloudflare credentials are available, run a dry deploy or preview deploy.

Dependencies: none.

## E01-T02 Add browser test harness

Status: Todo

Scope:

- Add Playwright or an equivalent browser test runner.
- Configure desktop viewport and mobile viewport smoke tests.
- Add a simple public-page and auth-page smoke test.

Acceptance criteria:

- Browser tests can run locally with one command.
- CI runs the browser tests or explicitly documents why they are deferred.
- Test artifacts are ignored by Git.

Validation:

- New browser test command passes locally.
- Existing `pnpm test` remains green.

Dependencies: `E01-T01`.

## E01-T03 Create architecture decision log

Status: Todo

Scope:

- Add an ADR folder or doc.
- Record decisions for local DB choice, test definition format, export schema
  governance, and consent model.

Acceptance criteria:

- ADR template exists.
- First ADR records why Senex is local-first.
- Each ADR has status, context, decision, consequences, and date.

Validation:

- `pnpm format:check`

Dependencies: none.

## E01-T04 Document approved framework patterns

Status: Todo

Scope:

- Document which Next/vinext APIs are approved in this app.
- Document when to use server components, client components, route handlers, and
  server actions.
- Document how `cloudflare:workers` bindings are accessed.

Acceptance criteria:

- `docs/stack.md` or a new architecture doc explains the approved patterns.
- Examples use current repo code, not generic Next.js snippets.

Validation:

- `pnpm format:check`

Dependencies: `E01-T01`.

## E01-T05 Add deployment smoke check

Status: Todo

Scope:

- Add a simple post-build or preview smoke script that can request the home
  page and auth route.
- Keep it safe for local and CI usage.

Acceptance criteria:

- Smoke check fails loudly when a route is unavailable.
- Docs explain when to run it.

Validation:

- Smoke script passes against a local preview or deployed preview.

Dependencies: `E01-T01`.
