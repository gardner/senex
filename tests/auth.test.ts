import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

// These tests run Better Auth against a real D1 database with the real
// committed migrations applied — no mocks. They cover the behavior the
// app actually depends on: schema, sign-up, sign-in, sessions, password
// resets, and the organization/admin/bearer plugins.

const PASSWORD = "a-perfectly-fine-password";

async function signUp(email: string, name = "Test User") {
  return auth.api.signUpEmail({
    body: { name, email, password: PASSWORD },
    returnHeaders: true,
  });
}

/** Cookie-bearing headers for an authenticated follow-up request. */
function sessionHeaders(responseHeaders: Headers): Headers {
  const cookie = responseHeaders.get("set-cookie");
  expect(cookie).toBeTruthy();
  return new Headers({ cookie: cookie! });
}

describe("database schema", () => {
  it("migrations created every table Better Auth needs", async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all<{ name: string }>();
    const tables = results.map((row) => row.name);

    for (const table of [
      "user",
      "session",
      "account",
      "verification",
      "organization",
      "member",
      "invitation",
    ]) {
      expect(tables).toContain(table);
    }
  });
});

describe("email/password auth", () => {
  it("signs up a user and stores it in D1 with the default role", async () => {
    const { response } = await signUp("ada@example.com", "Ada");

    expect(response.user.email).toBe("ada@example.com");

    const row = await env.DB.prepare(
      "SELECT name, email, role, banned FROM user WHERE email = ?",
    )
      .bind("ada@example.com")
      .first<{ name: string; email: string; role: string; banned: number }>();

    expect(row).toMatchObject({
      name: "Ada",
      email: "ada@example.com",
      role: "user", // admin plugin default — nobody signs up as admin
    });
    expect(row!.banned).toBeFalsy();
  });

  it("rejects sign-in with a wrong password", async () => {
    await signUp("careful@example.com");

    await expect(
      auth.api.signInEmail({
        body: { email: "careful@example.com", password: "wrong-password!" },
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects duplicate sign-ups for the same email", async () => {
    await signUp("once@example.com");
    await expect(signUp("once@example.com")).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("sign-in creates a session that getSession resolves to the user", async () => {
    await signUp("session@example.com");

    const { headers } = await auth.api.signInEmail({
      body: { email: "session@example.com", password: PASSWORD },
      returnHeaders: true,
    });

    const session = await auth.api.getSession({
      headers: sessionHeaders(headers),
    });

    expect(session?.user.email).toBe("session@example.com");
    expect(session?.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("sign-out invalidates the session", async () => {
    const { headers } = await signUp("leaver@example.com");
    const cookies = sessionHeaders(headers);

    await auth.api.signOut({ headers: cookies });

    const session = await auth.api.getSession({ headers: cookies });
    expect(session).toBeNull();
  });
});

describe("organization plugin", () => {
  it("a signed-in user can create an organization and becomes its owner", async () => {
    const { headers } = await signUp("founder@example.com");
    const cookies = sessionHeaders(headers);

    const org = await auth.api.createOrganization({
      body: { name: "Acme Inc", slug: "acme" },
      headers: cookies,
    });

    expect(org?.name).toBe("Acme Inc");

    const member = await env.DB.prepare(
      `SELECT m.role FROM member m
       JOIN user u ON u.id = m.userId
       WHERE u.email = ? AND m.organizationId = ?`,
    )
      .bind("founder@example.com", org!.id)
      .first<{ role: string }>();

    expect(member?.role).toBe("owner");
  });
});

describe("bearer plugin (API / mobile tokens)", () => {
  it("issues a token on sign-in that resolves a session via Authorization: Bearer", async () => {
    await signUp("api-user@example.com");

    const { headers } = await auth.api.signInEmail({
      body: { email: "api-user@example.com", password: PASSWORD },
      returnHeaders: true,
    });

    // The bearer plugin hands the token back in this response header; a
    // native/API client stores it and sends it as `Authorization: Bearer`.
    const token = headers.get("set-auth-token");
    expect(token).toBeTruthy();

    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });

    expect(session?.user.email).toBe("api-user@example.com");
  });
});

describe("password reset", () => {
  it("exposes the reset endpoint without revealing unknown emails", async () => {
    // The endpoint only exists because sendResetPassword is wired
    // (lib/auth/emails.ts). For an unknown address Better Auth returns
    // success and sends nothing — no account enumeration, no email attempted.
    const result = await auth.api.requestPasswordReset({
      body: { email: "nobody-here@example.com", redirectTo: "/reset-password" },
    });

    expect(result.status).toBe(true);
  });
});
