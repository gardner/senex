import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/admin/research-exclusions/route";
import { POST as POST_EXPORT } from "@/app/api/admin/research-export/route";
import { POST as POST_SUBMIT } from "@/app/api/reporting/anonymous/submit/route";
import type { ResearchExportBody } from "@/lib/admin/research-export";
import { auth } from "@/lib/auth";
import { acceptedDataQualityPayload } from "./admin-data-quality-fixtures";

const PASSWORD = "a-perfectly-fine-password";

describe("admin research exclusions API", () => {
  it("requires a signed-in admin", async () => {
    const anonymous = await POST(exclusionRequest(exclusionInput()));
    expect(anonymous.status).toBe(401);

    const user = await signUp("research-exclusion-user@example.com", "user");
    const forbidden = await POST(
      exclusionRequest(exclusionInput(), user.headers),
    );
    expect(forbidden.status).toBe(403);
  });

  it("marks future research exports excluded and records who changed it", async () => {
    const admin = await signUp("research-exclusion-admin@example.com", "admin");
    const payload = acceptedDataQualityPayload("study_exclusion_target");
    const accepted = await POST_SUBMIT(submitRequest(payload));
    expect(accepted.status).toBe(201);

    const response = await POST(
      exclusionRequest(
        exclusionInput({
          reason: "participant requested exclusion by support email",
        }),
        admin.headers,
      ),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      status: "ok",
      action: "exclude",
      matchedSubmissions: 1,
      changedSubmissions: 1,
      anonymousStudyIdHash: expect.any(String),
      limitationNotice: expect.stringContaining("Already generated"),
    });
    expect(JSON.stringify(body)).not.toContain("study_exclusion_target");
    expect(JSON.stringify(body)).not.toContain(payload.idempotencyKey);

    const stored = await env.DB.prepare(
      `SELECT deletion_request_status
       FROM anonymous_research_submissions
       WHERE idempotency_key = ?`,
    )
      .bind(payload.idempotencyKey)
      .first<{ deletion_request_status: string }>();
    expect(stored?.deletion_request_status).toBe("excluded");

    const audit = await env.DB.prepare(
      `SELECT event_type, event_json
       FROM anonymous_research_submission_audit
       WHERE submission_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
      .bind(`anonymous_submission_${payload.idempotencyKey}`)
      .first<{ event_type: string; event_json: string }>();
    expect(audit?.event_type).toBe("research_exclusion_changed");
    expect(JSON.parse(audit?.event_json ?? "{}")).toMatchObject({
      eventType: "research_exclusion_changed",
      action: "exclude",
      previousStatus: "none",
      nextStatus: "excluded",
      reason: "participant requested exclusion by support email",
      changedByUserId: admin.userId,
      limitationNotice: expect.stringContaining("Already generated"),
    });

    const exportResponse = await POST_EXPORT(
      exportRequest(
        {
          purpose: "post_exclusion_validation",
          approvalReference: "EXCLUSION-CHECK-001",
          dataCategories: ["share_trial_level_data"],
          anonymousStudyId: "study_exclusion_target",
        },
        admin.headers,
      ),
    );
    expect(exportResponse.status).toBe(201);

    const exportBody = (await exportResponse.json()) as ResearchExportBody;
    expect(exportBody.manifest.counts).toMatchObject({
      submissionsReviewed: 1,
      submissionsExported: 0,
      recordsExported: 0,
      excludedForWithdrawal: 1,
    });
    expect(exportBody.dataset.submissions).toHaveLength(0);
  });

  it("lists recent exclusion audit events without raw study identifiers", async () => {
    const admin = await signUp(
      "research-exclusion-list-admin@example.com",
      "admin",
    );
    const payload = acceptedDataQualityPayload("study_exclusion_list");
    const accepted = await POST_SUBMIT(submitRequest(payload));
    expect(accepted.status).toBe(201);

    const excluded = await POST(
      exclusionRequest(
        exclusionInput({
          anonymousStudyId: "study_exclusion_list",
          reason: "participant requested future exclusion",
        }),
        admin.headers,
      ),
    );
    expect(excluded.status).toBe(200);

    const listed = await GET(exclusionRequest({}, admin.headers));
    expect(listed.status).toBe(200);

    const body = (await listed.json()) as {
      status: string;
      events: Array<{
        action: string;
        nextStatus: string;
        reason: string;
        changedByUserId: string;
      }>;
    };
    expect(body.status).toBe("ok");
    expect(body.events[0]).toMatchObject({
      action: "exclude",
      nextStatus: "excluded",
      reason: "participant requested future exclusion",
      changedByUserId: admin.userId,
    });
    expect(JSON.stringify(body)).not.toContain("study_exclusion_list");
    expect(JSON.stringify(body)).not.toContain(payload.idempotencyKey);
  });
});

async function signUp(email: string, role: "admin" | "user") {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Research Exclusion", email, password: PASSWORD },
    returnHeaders: true,
  });
  if (role === "admin") {
    await env.DB.prepare("UPDATE user SET role = 'admin' WHERE id = ?")
      .bind(response.user.id)
      .run();
  }
  const cookie = headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return {
    userId: response.user.id,
    headers: new Headers({ cookie: cookie! }),
  };
}

function exclusionInput(
  overrides: Partial<{
    anonymousStudyId: string;
    reason: string;
    action: "exclude";
  }> = {},
) {
  return {
    anonymousStudyId: overrides.anonymousStudyId ?? "study_exclusion_target",
    reason: overrides.reason ?? "participant requested future exclusion",
    action: overrides.action ?? "exclude",
  };
}

function exclusionRequest(payload: unknown, headers = new Headers()) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/admin/research-exclusions", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
  });
}

function exportRequest(payload: unknown, headers = new Headers()) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/admin/research-export", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
  });
}

function submitRequest(payload: unknown) {
  return new Request("https://senex.nz/api/reporting/anonymous/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
