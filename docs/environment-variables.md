# Environment Variables

Secrets stay out of Git. Local values live in `.env` and `.dev.vars`, which are
gitignored. Production values live in Cloudflare.

## Local Setup

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

The committed examples work for local email/password auth. Google OAuth needs
real Google credentials.

## Why Two Files?

| File        | Read by                                     | Used when                |
| ----------- | ------------------------------------------- | ------------------------ |
| `.env`      | vinext CLI / Next-style env loading         | `pnpm dev`, `pnpm build` |
| `.dev.vars` | Cloudflare Workers runtime in local workerd | request handling in dev  |

The app reads runtime configuration from Cloudflare env bindings:

```ts
import { env } from "cloudflare:workers";
```

In local development those bindings come from `.dev.vars`. Keep `.env` and
`.dev.vars` aligned when a value affects both build-time and runtime behavior.

## Variables

| Variable               | Purpose                                        | Local    | Cloudflare | Browser-safe |
| ---------------------- | ---------------------------------------------- | -------- | ---------- | ------------ |
| `BETTER_AUTH_SECRET`   | Signs auth sessions and tokens                 | yes      | secret     | no           |
| `BETTER_AUTH_URL`      | Public app URL for auth callbacks and cookies  | yes      | plain var  | yes          |
| `GOOGLE_CLIENT_ID`     | Google OAuth public client id                  | optional | plain var  | yes          |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret                            | optional | secret     | no           |
| `APP_ENV`              | `development`, `preview`, `test`, `production` | yes      | plain var  | yes          |

## Production Secrets

Set secrets with Wrangler or the Cloudflare dashboard:

```bash
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put GOOGLE_CLIENT_SECRET
```

Generate a production auth secret with:

```bash
openssl rand -base64 32
```

Never commit `.env`, `.dev.vars`, API keys, OAuth secrets, or production auth
secrets.
