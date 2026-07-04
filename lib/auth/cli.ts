import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";

import { buildAuthOptions } from "./options";

// AIDEV-NOTE: CLI-only config for `@better-auth/cli generate` (it cannot load
// lib/auth/index.ts because "cloudflare:workers" doesn't exist in Node).
// The stub below answers schema-introspection queries with empty results, so
// the CLI emits the full CREATE TABLE script for an empty database.
// Usage:
//   pnpm dlx @better-auth/cli@latest generate --config lib/auth/cli.ts --output migrations/XXXX_name.sql

/** A D1 statement whose every query returns "no rows". */
const emptyStatement = {
  bind: () => emptyStatement,
  first: async () => null,
  run: async () => ({ results: [], success: true, meta: {} }),
  all: async () => ({ results: [], success: true, meta: {} }),
  raw: async () => [],
};

const emptyD1Stub = {
  prepare: () => emptyStatement,
  batch: async () => [],
  exec: async () => ({ count: 0, duration: 0 }),
  dump: async () => new ArrayBuffer(0),
} as unknown as D1Database;

// Schema generation never sends email; fail loudly if it ever tries.
const emailUnavailable = async () => {
  throw new Error("email sending is not available in the schema CLI");
};

export const auth = betterAuth({
  ...buildAuthOptions({ sendResetPassword: emailUnavailable }),
  secret: "schema-generation-only",
  database: {
    dialect: new D1Dialect({ database: emptyD1Stub }),
    type: "sqlite",
  },
});
