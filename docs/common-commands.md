# Common Commands

Run these from the project root.

## Daily Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:browser
pnpm build
```

## Formatting

```bash
pnpm format
pnpm format:check
```

Pre-commit hooks also run formatting and linting on staged files.

## Database

```bash
pnpm db:local:migrate
pnpm wrangler d1 migrations create senex-db describe_your_change
pnpm wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Use remote database commands only when you intentionally mean production.
Normal production migrations run through the GitHub to Cloudflare deploy path.

## Deployment Scripts

```bash
pnpm run check:migrations
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke:deploy
pnpm run deploy:preview
pnpm run deploy:prod
```

`deploy:prod` applies production D1 migrations before deploying the Worker.
Use it from Cloudflare Workers Builds, not casually from a laptop.

## Cloudflare

```bash
pnpm cf:whoami
pnpm cf:typegen
pnpm wrangler login
```

## Git

This directory may be used as a bootstrap workspace without Git. When it is a
Git worktree, use the normal branch and PR flow:

```bash
git status
git branch --show-current
git checkout -b your-name/small-change
git add .
git commit -m "Describe the change"
git push -u origin your-name/small-change
```
