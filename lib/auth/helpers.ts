import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./index";

// Server-side session helpers. Use these in server components, route
// handlers, and server actions instead of calling auth.api directly.

export type SessionUser = typeof auth.$Infer.Session.user;

/** The signed-in user, or null when the request has no valid session. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** The signed-in user — redirects to /sign-in when there isn't one. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

/**
 * The signed-in admin user — redirects to /sign-in when signed out, or to
 * /dashboard when signed in without the admin role.
 *
 * AIDEV-NOTE: role comes from the Better Auth admin plugin. The first admin
 * must be promoted manually in the database.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}
