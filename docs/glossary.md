# Glossary

## Project Terms

**Senex** - this bootstrap app and product workspace.

**vinext** - a Vite-based implementation of the Next.js 16 App Router API.

**Worker** - the Cloudflare runtime target for this app.

**D1** - Cloudflare's SQLite-based database product. Senex uses it through the
`DB` binding.

**Wrangler** - Cloudflare's CLI for local Worker development, D1 migrations,
type generation, and deployment.

**Binding** - a Cloudflare-provided runtime dependency, such as `DB`, `EMAIL`,
or `ASSETS`.

**Migration** - a SQL file in `migrations/` that changes database structure in
a controlled order.

**Better Auth** - the auth library used for signed-in accounts, organizations,
admin roles, bearer tokens, and password resets.

**Pre-commit hook** - a local Git hook that formats and lints staged files
before a commit is created.

## Product Terms

**Offline Mode** - product mode where data stays in browser storage and the
user has no account.

**Anonymous Reporting Mode** - product mode where the user contributes data
under a random study id without a traditional account.

**Signed-In Mode** - product mode where the user has a Better Auth account and
can sync history or manage richer consent settings.

**Consent record** - versioned record of what a user agreed to share, when, and
under which terms.

**Trial event** - one atomic test interaction, such as a stimulus and response
inside a cognitive task.

**Task run** - one execution of a test module within a session.

**Session** - a group of task runs completed together.

**Baseline** - a user's usual range, derived from repeated valid sessions.

**Quality flag** - a reason a trial, task run, or session may be excluded or
downgraded, such as focus loss or too few valid trials.

**Pseudonymous** - linked to an identifier that is not a direct identity, but
may still be sensitive or re-identifiable in combination with other data.
