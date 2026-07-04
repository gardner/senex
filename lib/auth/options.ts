import type { BetterAuthOptions } from "better-auth";
import { admin, bearer, organization } from "better-auth/plugins";

// AIDEV-NOTE: Shared Better Auth options, used by BOTH:
//   - lib/auth/index.ts  (runtime config — adds the real D1 database and the
//     real password-reset email sender)
//   - lib/auth/cli.ts    (schema generation — stub database + throwing email)
// Keep `database`, `secret`, `socialProviders`, and anything that imports
// "cloudflare:workers" OUT of this file (that module only exists inside the
// Workers runtime, and the Better Auth CLI runs in Node) — that's why
// buildAuthOptions takes the email sender as a parameter.
//
// If you add/remove plugins here, regenerate the D1 migration — see
// docs/database.md.

/** Subset of the data Better Auth passes to sendResetPassword. */
export type ResetPasswordEmailData = {
  user: { name: string; email: string };
  url: string;
};

/** The email senders the runtime injects (lib/auth/emails.ts) and the schema
 * CLI stubs out — see the AIDEV-NOTE above. */
export type AuthEmailSenders = {
  sendResetPassword: (data: ResetPasswordEmailData) => Promise<void>;
};

export function buildAuthOptions(emails: AuthEmailSenders) {
  return {
    appName: "senex",
    emailAndPassword: {
      enabled: true,
      // Password resets for existing accounts.
      sendResetPassword: emails.sendResetPassword,
    },
    plugins: [
      // Organizations: teams/workspaces with members and invitations.
      // https://better-auth.com/docs/plugins/organization
      organization(),
      // Admin: adds user.role ("admin" | "user"), banning, impersonation.
      // https://better-auth.com/docs/plugins/admin
      admin(),
      // Bearer: Authorization: Bearer <token> for mobile/API clients. The
      // sign-in response carries the token in the set-auth-token header;
      // no schema change. https://better-auth.com/docs/plugins/bearer
      bearer(),
    ],
  } satisfies BetterAuthOptions;
}
