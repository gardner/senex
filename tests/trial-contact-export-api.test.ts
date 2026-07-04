import { describe, expect, it } from "vitest";

import { GET as GET_EXPORT } from "@/app/api/account/export/route";
import { POST as POST_TRIAL_CONTACT } from "@/app/api/account/trial-contact/route";
import { auth } from "@/lib/auth";

const PASSWORD = "a-perfectly-fine-password";

describe("trial contact account export", () => {
  it("exports trial-contact data separately from synced records", async () => {
    const owner = await signUp("trial-contact-export-owner@example.com");
    const trialContact = await POST_TRIAL_CONTACT(
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
        owner.headers,
      ),
    );
    expect(trialContact.status).toBe(200);

    const response = await GET_EXPORT(accountRequest(owner.headers));
    expect(response.status).toBe(200);
    const body = (await response.json()) as AccountExportResponse;
    expect(body.trialContact.profile).toMatchObject({
      countryRegion: "New Zealand",
      broadHealthAnswers: ["memory_or_attention_concern"],
    });
    expect(JSON.stringify(body.records)).not.toContain("New Zealand");
  });
});

type AccountExportResponse = {
  trialContact: {
    profile: {
      countryRegion: string | null;
      broadHealthAnswers: string[];
    };
  };
  records: object;
};

async function signUp(email: string) {
  const { headers } = await auth.api.signUpEmail({
    body: { name: "Trial Contact Export", email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return {
    headers: new Headers({ cookie: cookie! }),
  };
}

function accountRequest(headers = new Headers()) {
  return new Request("https://senex.nz/api/account/export", {
    method: "GET",
    headers,
  });
}

function trialContactRequest(payload: unknown, headers: Headers) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/account/trial-contact", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
  });
}
