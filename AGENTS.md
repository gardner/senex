<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Senex is a Cloudflare-native `vinext` bootstrap repository. Auth, D1, email,
starter UI, tests, and Worker deployment configuration are in place. Product
behavior should be built on top of this foundation in small, reviewable slices.

The current product direction and platform documentation are:

| Doc                                                            | What it covers                         |
| -------------------------------------------------------------- | -------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                                     | Browser-based cognitive monitoring PRD |
| [docs/PLAN.md](docs/PLAN.md)                                   | Engineering implementation plan        |
| [docs/stack.md](docs/stack.md)                                 | Runtime, framework, and sharp edges    |
| [docs/framework-patterns.md](docs/framework-patterns.md)       | Approved vinext/App Router patterns    |
| [docs/adr/](docs/adr/)                                         | Architecture decision records          |
| [docs/local-data.md](docs/local-data.md)                       | Browser local storage platform         |
| [docs/export-import.md](docs/export-import.md)                 | JSON backup and restore                |
| [docs/test-engine.md](docs/test-engine.md)                     | Cognitive task runner and scoring      |
| [docs/cognitive-tasks.md](docs/cognitive-tasks.md)             | Task battery modules and status        |
| [docs/common-commands.md](docs/common-commands.md)             | Day-to-day commands                    |
| [docs/database.md](docs/database.md)                           | D1 setup and migrations                |
| [docs/environment-variables.md](docs/environment-variables.md) | Local and Cloudflare env vars          |
| [docs/deployment.md](docs/deployment.md)                       | Cloudflare Workers deployment          |
| [docs/testing.md](docs/testing.md)                             | Test runtime and quality gates         |
| [docs/email-sending.md](docs/email-sending.md)                 | Transactional email                    |
| [docs/usertypes.md](docs/usertypes.md)                         | Auth roles and product identity modes  |
| [docs/troubleshooting.md](docs/troubleshooting.md)             | Common local development failures      |

## The Stack

vinext (Next.js 16 API on Vite - not stock Next.js) on Cloudflare Workers; D1
via the `DB` binding and SQL migrations; Better Auth in `lib/auth/`
(email+password, organization, admin, bearer); bindings via
`import { env } from "cloudflare:workers"`; shadcn/ui components; Cloudflare
Email Sending via `lib/email.ts`. Details are in [docs/stack.md](docs/stack.md).

Before touching `package.json`, `vite.config.ts`, or framework behavior, inspect
the installed `vinext` and Next docs because this stack intentionally differs
from stock Next.js.

## Quality Gates

Pre-commit hooks format/lint staged files. CI-oriented scripts are:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:browser
pnpm build
```

Vitest runs in real workerd + real D1. Browser smoke tests run through
Playwright against the local vinext dev server. Prefer focused tests for
behavior changes. See [docs/testing.md](docs/testing.md).

## Workflow and Safety Rules

- Before modifying files, run `git status` and `git branch --show-current` when
  this directory is a Git worktree.
- Use `pnpm`.
- Prefer small reviewable changes.
- No destructive commands (`rm -rf`, `git reset --hard`, `git clean -fd`,
  `git push --force`, `wrangler delete`, `wrangler d1 delete`) without explicit
  confirmation.
- Never commit `.env*`, `.dev.vars`, keys, or credentials. The committed
  `.example` files are intentionally safe.
- Prefer GitHub-based deployment over manual production Cloudflare commands.
- Keep imports at the top of modules; never use deferred/try-catch imports.

## First Thing to Do in a Session

```bash
pwd
git status
git branch --show-current
cat package.json
ls docs
```

Base instructions on what actually exists - do not invent commands or docs.
