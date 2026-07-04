"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

// AIDEV-NOTE: Browser-side auth client. Components should import THIS for
// sign-in/sign-up/sign-out and session hooks — never lib/auth/index.ts,
// which is server-only (it touches D1 and secrets).
export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
