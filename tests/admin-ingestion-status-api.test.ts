import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/admin/ingestion/status/route";
import { POST } from "@/app/api/reporting/anonymous/submit/route";
import type { IngestionStatus } from "@/lib/admin/ingestion-status";
import { auth } from "@/lib/auth";
import {
  buildAnonymousReportingPayload,
  createAnonymousConsentRecord,
  createAnonymousIdentityRecord,
} from "@/lib/anonymous-reporting";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type LocalSession,
  type ScoreRecord,
  type TaskRunRecord,
} from "@/lib/local/schema";

const PASSWORD = "a-perfectly-fine-password";
const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";

describe("admin ingestion status API", () => {
  it("requires a signed-in admin", async () => {
    const anonymous = await GET(statusRequest());
    expect(anonymous.status).toBe(401);

    const user = await signUp("ingestion-user@example.com", "user");
    const forbidden = await GET(statusRequest(user.headers));
    expect(forbidden.status).toBe(403);
  });

  it("summarizes accepted and failed anonymous submissions without raw study identifiers", async () => {
    const admin = await signUp("ingestion-admin@example.com", "admin");
    const payload = acceptedPayload("study_admin_status");
    const accepted = await POST(submitRequest(payload));
    expect(accepted.status).toBe(201);

    const rejected = await POST(
      submitRequest({
        ...payload,
        anonymousStudyId: "study_failed_visible_only_in_storage",
        idempotencyKey: `${payload.idempotencyKey}_bad`,
        includedCategories: [
          ...payload.includedCategories,
          "share_trial_level_data",
        ],
      }),
    );
    expect(rejected.status).toBe(400);

    const response = await GET(statusRequest(admin.headers));
    expect(response.status).toBe(200);

    const body = (await response.json()) as IngestionStatus;
    expect(body.status).toBe("ok");
    expect(body.summary).toMatchObject({
      acceptedSubmissions: 1,
      failedSubmissions: 1,
      pendingReview: 1,
    });
    expect(body.schemaVersions).toContainEqual({
      localSchemaVersion: String(LOCAL_SCHEMA_VERSION),
      appVersion: LOCAL_APP_VERSION,
      acceptedSubmissions: 1,
      failedSubmissions: 1,
    });
    expect(body.failures[0]).toMatchObject({
      status: "rejected",
      retryState: "needs_review",
      actionRequired: expect.stringContaining("Review"),
      error: expect.stringContaining("share_trial_level_data"),
    });
    expect(body.recentSubmissions[0]).toMatchObject({
      status: "accepted",
      categoryCount: 1,
      recordCount: 3,
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("study_admin_status");
    expect(serialized).not.toContain("study_failed_visible_only_in_storage");
    expect(serialized).not.toContain(payload.idempotencyKey);
  });
});

async function signUp(email: string, role: "admin" | "user") {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Ingestion Status", email, password: PASSWORD },
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

function statusRequest(headers = new Headers()) {
  return new Request("https://senex.nz/api/admin/ingestion/status", {
    method: "GET",
    headers,
  });
}

function submitRequest(payload: unknown) {
  return new Request("https://senex.nz/api/reporting/anonymous/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function acceptedPayload(anonymousStudyId: string) {
  return buildAnonymousReportingPayload({
    identity: createAnonymousIdentityRecord({
      profileId: "profile_admin_ingestion",
      anonymousStudyId,
      createdAt: now,
    }),
    consentRecords: [
      createAnonymousConsentRecord({
        profileId: "profile_admin_ingestion",
        category: "share_test_summaries",
        decision: "granted",
        decidedAt: now,
        sourceScreen: "reporting_center",
      }),
    ],
    localData: fixtureLocalData(),
    scope: { type: "all_existing_history" },
    generatedAt: now,
  });
}

function fixtureLocalData() {
  const sessions: LocalSession[] = [
    {
      sessionId: "session_admin_ingestion",
      profileId: "profile_admin_ingestion",
      startedAt: now,
      completedAt: later,
      cadence: "daily",
      contextSnapshot: {},
      qualityFlags: [],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
  const taskRuns: TaskRunRecord[] = [
    {
      taskRunId: "task_run_admin_ingestion",
      sessionId: "session_admin_ingestion",
      taskId: "simple_reaction_time",
      taskVersion: "1.0.0",
      stimulusPackId: "pack_1",
      stimulusSeed: "seed_1",
      startedAt: now,
      completedAt: later,
      summaryScore: { medianRtMs: 412 },
      qualityFlags: [],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
  const scores: ScoreRecord[] = [
    {
      scoreId: "score_admin_ingestion",
      sessionId: "session_admin_ingestion",
      taskRunId: "task_run_admin_ingestion",
      domain: "reaction_speed",
      metricName: "median_rt_ms",
      rawValue: 412,
      normalizedValue: null,
      confidence: 0.9,
      qualityFlags: [],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
  return {
    sessions,
    taskRuns,
    scores,
    trialEvents: [],
    questionnaireAnswers: [],
  };
}
