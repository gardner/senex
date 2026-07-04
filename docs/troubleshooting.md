# Troubleshooting

Work from the first relevant section downward. Capture the full command and
full error message when asking for help.

## Wrong Directory

```bash
pwd
ls docs
cat package.json
```

The package name should be `senex`.

## Missing Dependencies

```bash
pnpm install
```

If `pnpm` is missing:

```bash
corepack enable
```

Then reopen the shell.

## Missing Local Env Files

```bash
ls -la .env .dev.vars
```

If either file is missing:

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

## Sign-In Fails Locally

The local D1 database may not have tables yet:

```bash
pnpm db:local:migrate
```

If local state appears corrupted, stop the dev server and move the local
Wrangler state aside before recreating it:

```bash
mv .wrangler/state ".wrangler/state.bak.$(date +%Y%m%d%H%M%S)"
pnpm db:local:migrate
```

You will need to sign up again because local accounts live in that state.

## D1 Binding or "no such table" Errors

Check that `wrangler.jsonc` still has a `d1_databases` entry with binding
`DB`, then run:

```bash
pnpm db:local:migrate
```

## Cloudflare Login Required

```bash
pnpm wrangler login
pnpm cf:whoami
```

This is only needed for Cloudflare and D1 commands, not ordinary local
development.

## Build Fails

1. Run `pnpm install`.
2. Read the first error, not the last cascade.
3. Check whether the failure is in framework code, app code, or generated types.
4. If framework behavior is involved, read the installed Next/vinext docs.

## Port 3000 Is Busy

Another dev server is running. Close the other terminal or stop that process,
then run:

```bash
pnpm dev
```
