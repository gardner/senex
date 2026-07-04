# Senex

Senex is a Cloudflare-native `vinext` bootstrap app. It provides a working
foundation for a browser-based product: auth, database, email, UI components,
tests, and deploy configuration are already wired together.

The current product direction is captured in:

- [docs/PRD.md](docs/PRD.md) - product requirements for browser-based cognitive
  monitoring
- [docs/PLAN.md](docs/PLAN.md) - engineering implementation plan
- [tickets/](tickets/) - epics and implementation tickets derived from the plan

The foundation uses [vinext](https://github.com/cloudflare/vinext) (Next.js 16
App Router API on Vite) on **Cloudflare Workers**, **Cloudflare D1** for the
database, **Better Auth** for sign-in, and **shadcn/ui** + Tailwind for the
interface.

> **Status:** this is a bootstrap repository. The platform foundation is in
> place; product-specific behavior should be built in small, reviewable slices.

## Quick Start

```bash
pnpm install
cp .env.example .env
cp .dev.vars.example .dev.vars
pnpm db:local:migrate     # create local database tables
pnpm dev                  # http://localhost:3000
```

## The Foundation

- **Auth** - Better Auth with email + password, optional Google OAuth,
  organizations, an admin role, bearer tokens for API/mobile clients, and an
  email-backed password-reset flow.
- **Database** - Cloudflare D1 with SQL migrations in `migrations/`.
- **Email** - transactional email via Cloudflare Email Sending, sent only
  through `lib/email.ts`.
- **UI** - shadcn/ui components + Tailwind, a public landing page, and a
  signed-in dashboard.
- **Quality** - a real-workerd test suite, pre-commit hooks, and CI-ready
  scripts for typechecking, linting, unit tests, browser smoke tests, and
  building.

## Documentation

**Product**

| Doc                     | What it covers                  |
| ----------------------- | ------------------------------- |
| [PRD.md](docs/PRD.md)   | Product requirements            |
| [PLAN.md](docs/PLAN.md) | Engineering implementation plan |

**Platform and operations**

| Doc                                                       | What it covers                         |
| --------------------------------------------------------- | -------------------------------------- |
| [stack.md](docs/stack.md)                                 | Runtime, framework, and sharp edges    |
| [framework-patterns.md](docs/framework-patterns.md)       | Approved vinext/App Router patterns    |
| [adr/](docs/adr/)                                         | Architecture decision records          |
| [local-data.md](docs/local-data.md)                       | Browser local storage platform         |
| [export-import.md](docs/export-import.md)                 | JSON backup and restore                |
| [test-engine.md](docs/test-engine.md)                     | Cognitive task runner and scoring      |
| [common-commands.md](docs/common-commands.md)             | Day-to-day commands                    |
| [database.md](docs/database.md)                           | D1 setup, migrations, and admin roles  |
| [environment-variables.md](docs/environment-variables.md) | Local and production configuration     |
| [deployment.md](docs/deployment.md)                       | Cloudflare Workers deployment          |
| [email-sending.md](docs/email-sending.md)                 | Transactional email through Cloudflare |
| [testing.md](docs/testing.md)                             | Test runtime and quality gates         |
| [code-review.md](docs/code-review.md)                     | Automated review workflow              |
| [usertypes.md](docs/usertypes.md)                         | Auth roles and product identity modes  |
| [troubleshooting.md](docs/troubleshooting.md)             | Common local development failures      |
| [glossary.md](docs/glossary.md)                           | Project and product terms              |

## Common Commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:browser
pnpm build
pnpm db:local:migrate
```

## Deployment Shape

The app is configured for Cloudflare Workers, not Cloudflare Pages. The Worker,
D1 database, and Email Sending binding are defined in `wrangler.jsonc`.

Production-like deploys should normally happen through GitHub-connected
Cloudflare Workers Builds after review, not by ad hoc local deploys. Configure
Workers Builds with:

```text
Build command: pnpm install --frozen-lockfile && pnpm run build
Deploy command: pnpm run deploy:prod
Non-production branch deploy command: pnpm run deploy:preview
Path: /
```

## For Coding Agents

Read [AGENTS.md](AGENTS.md) first. This project uses `vinext`, not stock
Next.js. Before touching framework-specific code, check the installed docs under
`node_modules/next/dist/docs/` and the `vinext` docs for the supported API
surface.
