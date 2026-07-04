# Release Gates

Scope: E12-T04 release checklists for Senex Release 0.1 through Release 1.0.
These gates convert the PLAN release outline into explicit must-pass checks for
quality, accessibility, privacy/security, deployment, data migration, and
reviewer sign-off.

References:

- [PLAN release plan](PLAN.md#19-release-plan)
- [Testing](testing.md)
- [Deployment](deployment.md)
- [Database](database.md)
- [Threat model](threat-model.md)
- [Accessibility audit](accessibility-audit.md)
- [Copy safety](copy-safety.md)
- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
- [FDA General Wellness guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices)

## Release Rules

- A release cannot ship with an unresolved `Release Blocker: yes` follow-up for
  that release surface.
- Release evidence must include command output or CI links for automated gates.
- Preview releases must not apply production D1 migrations.
- Production releases use GitHub-connected Cloudflare Workers Builds:
  build, migration safety check, remote D1 migrations, then Worker deploy.
- Manual production operations require written reason and owner.
- Product and engineering sign-off are required for every release.

## Release 0.1 - Engineering Prototype

Audience: internal only.

Must-pass checks:

### Quality Gate

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass.
- Reaction Time Sprint stores local sessions, task runs, scores, and trial
  events.
- 50 or more internal sessions complete without data loss.
- Export/import round trip works with a current local backup.
- Timing data is plausible in a browser smoke run.

### Accessibility Gate

- Public shell and auth routes pass the browser smoke coverage for desktop and
  mobile Chromium.
- Primary keyboard focus states are visible in the prototype surfaces.

### Privacy And Security Gate

- Offline Mode emits no analytics network requests by default.
- No credentials, `.env*`, `.dev.vars`, or generated secrets are committed.
- User-facing copy stays non-diagnostic.

### Deployment Gate

- A preview or production-like Worker build succeeds through the configured
  Cloudflare Workers Builds commands.
- `SMOKE_BASE_URL=<release-url> pnpm smoke:deploy` passes after deploy.

### Data Migration Gate

- `pnpm db:local:migrate` applies cleanly on a fresh local database.
- No destructive migration is introduced.

### Reviewer Sign-Off

- Product owner confirms Release 0.1 scope is internal-only.
- Engineering owner confirms all evidence links are attached to the release
  checklist.

## Release 0.2 - Offline Alpha

Audience: internal users and trusted testers.

Must-pass checks:

### Quality Gate

- Release 0.1 automated gates still pass.
- Offline onboarding, local dashboard, JSON backup/restore, and local deletion
  browser flows pass.
- No critical data-loss bug remains open.
- Quality flags are captured for interrupted or invalid task runs.
- Trusted-tester usability findings marked blocking are resolved or descoped.

### Accessibility Gate

- Offline onboarding and dashboard are keyboard reachable.
- Touch targets and form labels are reviewed on mobile Chromium screenshots.

### Privacy And Security Gate

- Local deletion copy accurately describes browser-local scope.
- JSON import rejects invalid, corrupt, and future-version backup files.
- Offline Mode remains local-first with no default upload path.

### Deployment Gate

- Preview deploy is generated for the release branch.
- Production deploy command remains `pnpm run deploy:prod`.

### Data Migration Gate

- Local schema migrations preserve existing tester data.
- Export/import rollback behavior is verified before tester rollout.

### Reviewer Sign-Off

- Product owner confirms alpha tester expectations and limitations are clear.
- Engineering owner confirms no blocking local-data or backup issue remains.

## Release 0.3 - Offline Beta

Audience: wider private beta.

Must-pass checks:

### Quality Gate

- Release 0.2 automated gates still pass.
- Sequence Tap, Pair Learning, baseline logic, trend summaries, and hardened
  export/import tests pass.
- Baseline formation is stable across fixture and browser runs.
- Nontechnical task instructions pass product review.

### Accessibility Gate

- `pnpm test:browser` includes the accessibility baseline.
- Keyboard-only task-runner completion passes for supported tasks.
- No unresolved P0 issue remains in `docs/accessibility-audit.md`.

### Privacy And Security Gate

- Backup/import validation has tests for invalid previews and rollback.
- Routine dashboard copy stays within the non-diagnostic copy boundary.
- No new user-facing data movement route lacks an explicit consent gate.

### Deployment Gate

- Preview deploy smoke test passes before inviting wider beta users.
- Rollback path is documented for the release branch.

### Data Migration Gate

- Local backup files from Release 0.2 import into Release 0.3.
- Migration failures surface loudly and do not erase local history.

### Reviewer Sign-Off

- Product owner confirms beta feedback criteria are documented.
- Engineering owner confirms accessibility and import/export evidence are
  attached.

## Release 0.4 - Anonymous Reporting Alpha

Audience: private research pilot.

Must-pass checks:

### Quality Gate

- Release 0.3 automated gates still pass.
- Anonymous ID, research consent, demographics, reporting upload, reporting
  dashboard, and pause/stop future reporting flows pass.
- Ingestion idempotency and validation tests pass.
- Admin ingestion/data-quality dashboards show aggregate operational status.

### Accessibility Gate

- Reporting consent and dashboard controls are keyboard reachable.
- Consent choices expose clear accessible labels.

### Privacy And Security Gate

- Consent gating is verified on client payloads and server ingestion.
- Withdrawal stops future sharing.
- Admin views do not expose raw study IDs, idempotency keys, raw answers, or
  raw trial payloads.
- Small-cell and re-identification guardrails are visible for internal data
  quality observability.

### Deployment Gate

- Cloudflare Workers Builds production command still runs migrations before
  Worker deploy.
- Build token has D1 edit permission if production migrations are part of the
  deploy.

### Data Migration Gate

- Anonymous reporting D1 migrations are additive.
- `pnpm run check:migrations` passes.

### Reviewer Sign-Off

- Product owner confirms research-pilot consent language.
- Engineering owner confirms ingestion, withdrawal, and admin redaction
  evidence.

## Release 0.5 - Signed-In Alpha

Audience: private signed-in beta.

Must-pass checks:

### Quality Gate

- Release 0.4 automated gates still pass.
- Account creation, sign-in, account history import, anonymous linking, account
  export/delete request, and trial-contact opt-in flows pass.
- Account sync rejects payloads for a different account.

### Accessibility Gate

- Account and trial-contact forms are keyboard reachable and labeled.
- Error and confirmation states are visible without pointer input.

### Privacy And Security Gate

- Account sync remains separate from Anonymous Reporting consent.
- Anonymous linking requires explicit accepted consent.
- Trial-contact opt-in is separate from research sharing and audit-visible.
- Staff/admin production operations remain blocked until required release-gated
  security follow-ups are resolved.

### Deployment Gate

- Preview deploy smoke test passes for signed-in routes.
- Production release has rollback owner and support owner assigned.

### Data Migration Gate

- Account-sync and trial-contact migrations are additive.
- Account export/deletion audit records are append-only.

### Reviewer Sign-Off

- Product owner confirms signed-in alpha expectations and trial-contact copy.
- Engineering owner confirms auth, account data, and audit evidence.

## Release 1.0 - Public MVP

Audience: public MVP.

Must-pass checks:

### Quality Gate

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:browser`, and
  `pnpm build` pass in CI.
- Core daily/weekly tasks, Offline Mode, Anonymous Reporting Mode, Signed-In
  Mode, JSON export/import, consent center, research dashboard, trial-contact
  opt-in, and conservative trend reporting all have passing tests.

### Accessibility Gate

- Accessibility Review is complete and linked from `docs/accessibility-audit.md`.
- No unresolved WCAG A/AA P0 issue remains for public/auth, dashboard, account,
  reporting, or task-runner flows.

### Privacy And Security Gate

- Privacy Review is complete against `docs/threat-model.md`,
  `docs/telemetry.md`, and `docs/anonymous-reporting.md`.
- All release-blocking security follow-ups for public launch, staff/admin
  production operations, external partner export, and trial recruiter workflows
  are resolved or explicitly descoped.
- Data retention, account export, deletion request, anonymous withdrawal, and
  research exclusion limits are documented.

### Deployment Gate

- Production deploy uses reviewed GitHub merge to the production branch.
- Cloudflare Workers Builds uses the documented build/deploy commands.
- Production D1 migrations apply before Worker deploy.
- Post-deploy smoke check passes against the production URL.

### Data Migration Gate

- All production migrations are additive or have an approved expand/contract
  plan.
- Backup/restore compatibility is verified for supported local schema versions.
- Remote migration safety check passes before deploy.

### Reviewer Sign-Off

- Product owner confirms public MVP scope, support docs, consent language, and
  limitations.
- Engineering owner confirms CI, deployment, migration, rollback, and
  observability evidence.
- Privacy reviewer completes Privacy Review.
- Clinical reviewer or designated product/legal reviewer completes
  Clinical-Claim Boundary Review against `docs/copy-safety.md` and the FDA
  General Wellness intended-use boundary.
