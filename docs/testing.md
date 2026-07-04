# Testing

## Quality Gates

CI-oriented checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
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

## Product Testing Direction

For the cognitive-monitoring product, prefer tests around:

- local-first storage contracts
- export/import schema validation
- consent gating
- deterministic scoring and baseline calculations
- migration behavior across schema versions
- accessibility-sensitive flows such as keyboard operation
