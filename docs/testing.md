# Testing

## Quality Gates

CI-oriented checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:browser
pnpm build
```

Pre-commit hooks run formatting and linting on staged files.

## Test Runtime

`pnpm test` runs Vitest in real workerd with a real in-memory D1 database via
`@cloudflare/vitest-pool-workers`.

Important details:

- SQL migrations from `migrations/` are read in `vitest.config.ts`.
- `tests/apply-migrations.ts` applies those migrations before each test file.
- Tests exercise the real Better Auth adapter and D1 behavior.
- Avoid mocks for infrastructure behavior the app depends on.

## Config Notes

`vitest.config.ts` does not use `wrangler.jsonc`. The app Worker entry imports
vinext virtual modules that only exist inside the vinext build environment, so
tests declare the required bindings directly.

Storage is isolated per test file. Keep tests deterministic and explicit about
data setup.

## Browser Smoke Tests

`pnpm test:browser` applies local D1 migrations, starts `pnpm dev` through
Playwright's `webServer` config, and runs desktop plus mobile Chromium smoke
tests from `tests/browser/`.

Local IndexedDB repository tests also run through Playwright so the core browser
storage behavior is exercised in Chromium rather than mocked.

JSON export/import tests cover schema validation in Vitest and browser
generation, preview, merge, replace, and rollback behavior in Playwright.

Anonymous reporting tests cover consent state transitions, category gating,
idempotent queue records, D1 ingestion idempotency, rejection of unconsented
payload categories, and the browser reporting dashboard.

Questionnaire tests cover schema validation, prefer-not-to-say handling,
versioned answer history, research profile completion, session context quality
flags, and browser rendering/saving on desktop and mobile Chromium.

Test-engine unit tests cover definition validation, state transitions, timing,
quality flags, scoring, baselines, and trends. Cognitive-task tests cover the
full local demo battery and dashboard aggregation. Browser tests cover
monotonic timing, visibility metadata, Symbol Match keyboard/pointer capture,
Arrow Focus keyboard/touch capture, Sequence Tap keyboard/touch/missed-response
capture, Pair Learning study/immediate/delayed/recognition capture, and
Seven-Day Learning repeated-pack/missed-day capture, and full-battery
persistence where feasible.

Critical browser-flow tests cover browser-network-off private task completion,
anonymous-reporting consent withdrawal, and hidden-tab interruption persistence
on sessions, task runs, and scores.

`tests/quality-coverage.test.ts` tracks E11 hardening coverage for conservative
baseline/trend edges, duplicate trial-quality exclusions, even-count task
medians, anonymous reporting category declarations, and backup stimulus
reference integrity.

To test an already running server or preview URL:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:browser
PLAYWRIGHT_BASE_URL=https://preview.example.workers.dev pnpm test:browser
```

CI installs Chromium and runs `pnpm test:browser` after the Vitest suite.

Generated browser artifacts are ignored by Git:

- `playwright-report/`
- `test-results/`

## Deployment Smoke

`pnpm smoke:deploy` checks that a deployed or local URL serves the home page and
auth entry pages. It is intended for preview URLs, production verification, or a
local server you started separately.

```bash
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke:deploy
SMOKE_BASE_URL=https://senex.nz pnpm smoke:deploy
```

The script exits non-zero if any checked route is unavailable or returns
unexpected content.

## Product Testing Direction

For the cognitive-monitoring product, prefer tests around:

- local-first storage contracts
- offline onboarding and local dashboard states
- export/import schema validation
- consent gating
- deterministic scoring and baseline calculations
- migration behavior across schema versions
- accessibility-sensitive flows such as keyboard operation
