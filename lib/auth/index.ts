import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { D1Dialect } from "kysely-d1";

import { sendResetPasswordEmail } from "./emails";
import { buildAuthOptions } from "./options";

// AIDEV-NOTE: This is the ONLY place the app constructs Better Auth.
// Bindings (env.DB etc.) come from "cloudflare:workers", which works in both
// `pnpm dev` and production because @cloudflare/vite-plugin runs the server
// inside workerd. Local values come from .dev.vars; production values come
// from Cloudflare vars/secrets. See docs/environment-variables.md.

/**
 * Placeholder values in .dev.vars.example use the `<like this>` convention.
 * Treat them (and empty strings) as "not configured".
 */
function configured(value: string | undefined): value is string {
  return Boolean(value) && !value!.startsWith("<");
}

export const googleAuthEnabled =
  configured(env.GOOGLE_CLIENT_ID) && configured(env.GOOGLE_CLIENT_SECRET);

const options = buildAuthOptions({
  sendResetPassword: sendResetPasswordEmail,
});

export const auth = betterAuth({
  ...options,
  // AIDEV-NOTE: nextCookies must be LAST — it forwards the Set-Cookie of every
  // preceding plugin into Next's cookie store, so Server Actions can mint a
  // session without parsing Set-Cookie by hand. It only acts inside a Next
  // request scope (a Server Action); on the /api routes and in tests it no-ops
  // (cookies() throws outside a request scope and the plugin swallows it), so
  // the bearer/API path is untouched. Runtime-only, so it lives here and not
  // in the CLI-shared options.ts.
  plugins: [...options.plugins, nextCookies()],
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: {
    dialect: new D1Dialect({ database: env.DB }),
    type: "sqlite",
  },
  socialProviders: googleAuthEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
});
