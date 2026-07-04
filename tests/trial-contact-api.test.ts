import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/account/trial-contact/route";
import { auth } from "@/lib/auth";

const PASSWORD = "a-perfectly-fine-password";

describe("trial contact API", () => {
  it("creates separate current profile and profile event tables", async () => {
    const tables = await env.DB.prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
         AND name IN ('trial_contact_profiles', 'trial_contact_profile_events')
       ORDER BY name`,
    ).all<{ name: string }>();

    expect(tables.results.map((row) => row.name)).toEqual([
      "trial_contact_profile_events",
      "trial_contact_profiles",
    ]);
  });

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

  it("stores, audits, and clears trial-contact profile fields", async () => {
    const { headers, userId } = await signUp("trial-profile@example.com");

    const saved = await POST(
      trialContactRequest(
        {
          enabled: true,
          profile: {
            preferredContactMethod: "account_email",
            countryRegion: "New Zealand",
            ageEligibility: "40_to_64",
            broadHealthAnswers: ["memory_or_attention_concern"],
            availabilityPreference: "remote_only",
          },
        },
        headers,
      ),
    );
    expect(saved.status).toBe(200);
    const savedBody = (await saved.json()) as TrialContactResponse;
    expect(savedBody.trialContact.profile).toMatchObject({
      profileVersion: "trial-contact-profile-v1",
      preferredContactMethod: "account_email",
      countryRegion: "New Zealand",
      ageEligibility: "40_to_64",
      broadHealthAnswers: ["memory_or_attention_concern"],
      availabilityPreference: "remote_only",
    });
    expect(savedBody.trialContact.profile.lastReviewedAt).toEqual(
      expect.any(String),
    );

    const cleared = await POST(
      trialContactRequest(
        {
          profile: {
            preferredContactMethod: null,
            countryRegion: "",
            ageEligibility: null,
            broadHealthAnswers: [],
            availabilityPreference: null,
          },
        },
        headers,
      ),
    );
    expect(cleared.status).toBe(200);
    const clearedBody = (await cleared.json()) as TrialContactResponse;
    expect(clearedBody.trialContact.profile).toMatchObject({
      preferredContactMethod: null,
      countryRegion: null,
      ageEligibility: null,
      broadHealthAnswers: [],
      availabilityPreference: null,
    });

    const events = await env.DB.prepare(
      `SELECT event_type, preferred_contact_method, country_region,
              broad_health_answers_json
       FROM trial_contact_profile_events
       WHERE user_id = ?
       ORDER BY rowid`,
    )
      .bind(userId)
      .all<{
        event_type: string;
        preferred_contact_method: string | null;
        country_region: string | null;
        broad_health_answers_json: string;
      }>();
    expect(events.results).toHaveLength(2);
    expect(events.results.map((event) => event.event_type)).toEqual([
      "updated",
      "cleared",
    ]);
    expect(events.results[0].preferred_contact_method).toBe("account_email");
    expect(events.results[0].country_region).toBe("New Zealand");
    expect(JSON.parse(events.results[0].broad_health_answers_json)).toEqual([
      "memory_or_attention_concern",
    ]);
    expect(events.results[1].preferred_contact_method).toBeNull();
    expect(events.results[1].country_region).toBeNull();

    const consentEvents = await env.DB.prepare(
      `SELECT event_id
       FROM trial_contact_consent_events
       WHERE user_id = ?`,
    )
      .bind(userId)
      .all<{ event_id: string }>();
    expect(consentEvents.results).toHaveLength(1);
  });

  it("rejects invalid trial-contact profile values", async () => {
    const { headers } = await signUp("trial-profile-invalid@example.com");

    const response = await POST(
      trialContactRequest(
        {
          enabled: true,
          profile: {
            preferredContactMethod: "unsupported_method",
            countryRegion: "New Zealand",
            ageEligibility: "40_to_64",
            broadHealthAnswers: [],
            availabilityPreference: "remote_only",
          },
        },
        headers,
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      status: "rejected",
      error: expect.stringContaining("preferredContactMethod"),
    });
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
    profile: {
      profileVersion: string;
      preferredContactMethod: string | null;
      countryRegion: string | null;
      ageEligibility: string | null;
      broadHealthAnswers: string[];
      availabilityPreference: string | null;
      lastReviewedAt: string | null;
    };
  };
};
