import { applyD1Migrations, env } from "cloudflare:test";

// Runs before each test file: applies the committed SQL migrations from
// migrations/ to this file's isolated D1 instance. This means the tests
// exercise the exact schema production runs — schema drift between the
// migrations and what Better Auth expects fails loudly here.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
