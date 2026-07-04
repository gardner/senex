import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/account/trial-contact/route";
import { auth } from "@/lib/auth";

const PASSWORD = "a-perfectly-fine-password";

describe("trial contact API", () => {
  it("requires a signed-in account", async () => {
    const getResponse = await GET(trialContactRequest());
    const postResponse = await POST(trialContactRequest({ enabled: true }));

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
  });

  it("records opt-in and opt-out as separate consent events", async () => {
    const { headers, userId } = await signUp("trial-contact@example.com");

    const initial = await GET(trialContactRequest(undefined, headers));
    expect(initial.status).toBe(200);
    expect(await initial.json()).toMatchObject({
      status: "ok",
      trialContact: {
        enabled: false,
        consentVersion: "trial-contact-v1",
        optedInAt: null,
        optedOutAt: null,
        lastReviewedAt: null,
      },
    });

    const optedIn = await POST(trialContactRequest({ enabled: true }, headers));
    expect(optedIn.status).toBe(200);
    const inBody = (await optedIn.json()) as TrialContactResponse;
    expect(inBody).toMatchObject({
      status: "ok",
      trialContact: {
        enabled: true,
        consentVersion: "trial-contact-v1",
        optedOutAt: null,
      },
    });
    expect(inBody.trialContact.optedInAt).toEqual(expect.any(String));
    expect(inBody.trialContact.lastReviewedAt).toEqual(expect.any(String));

    const optedOut = await POST(
      trialContactRequest({ enabled: false }, headers),
    );
    expect(optedOut.status).toBe(200);
    const outBody = (await optedOut.json()) as TrialContactResponse;
    expect(outBody).toMatchObject({
      status: "ok",
      trialContact: {
        enabled: false,
        consentVersion: "trial-contact-v1",
      },
    });
    expect(outBody.trialContact.optedInAt).toBe(inBody.trialContact.optedInAt);
    expect(outBody.trialContact.optedOutAt).toEqual(expect.any(String));
    expect(outBody.trialContact.lastReviewedAt).toEqual(expect.any(String));

    const rows = await env.DB.prepare(
      `SELECT enabled, consent_version, decided_at, source
       FROM trial_contact_consent_events
       WHERE user_id = ?
       ORDER BY rowid`,
    )
      .bind(userId)
      .all<{
        enabled: number;
        consent_version: string;
        decided_at: string;
        source: string;
      }>();
    expect(rows.results).toHaveLength(2);
    expect(rows.results.map((row) => row.enabled)).toEqual([1, 0]);
    expect(rows.results.map((row) => row.consent_version)).toEqual([
      "trial-contact-v1",
      "trial-contact-v1",
    ]);
    expect(rows.results.map((row) => row.source)).toEqual([
      "account_trial_contact",
      "account_trial_contact",
    ]);
  });
});

async function signUp(email: string) {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Trial Contact Owner", email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return {
    userId: response.user.id,
    headers: new Headers({ cookie: cookie! }),
  };
}

function trialContactRequest(body?: unknown, headers = new Headers()) {
  const requestHeaders = new Headers(headers);
  if (body) requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/account/trial-contact", {
    method: body ? "POST" : "GET",
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

type TrialContactResponse = {
  trialContact: {
    optedInAt: string | null;
    optedOutAt: string | null;
    lastReviewedAt: string | null;
  };
};
