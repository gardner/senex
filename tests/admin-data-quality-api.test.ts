import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/admin/data-quality/route";
import { POST } from "@/app/api/reporting/anonymous/submit/route";
import type { DataQualityDashboard } from "@/lib/admin/data-quality";
import { auth } from "@/lib/auth";
import {
  acceptedDataQualityPayload,
  dataQualityLater,
} from "./admin-data-quality-fixtures";
import { LOCAL_APP_VERSION, LOCAL_SCHEMA_VERSION } from "@/lib/local/schema";

const PASSWORD = "a-perfectly-fine-password";

describe("admin data quality API", () => {
  it("requires a signed-in admin", async () => {
    const anonymous = await GET(dashboardRequest());
    expect(anonymous.status).toBe(401);

    const user = await signUp("data-quality-user@example.com", "user");
    const forbidden = await GET(dashboardRequest(user.headers));
    expect(forbidden.status).toBe(403);
  });

  it("returns aggregate quality metrics without raw research identifiers", async () => {
    const admin = await signUp("data-quality-admin@example.com", "admin");
    const payload = acceptedDataQualityPayload("study_data_quality_hidden");

    const accepted = await POST(submitRequest(payload));
    expect(accepted.status).toBe(201);

    await env.DB.prepare(
      `INSERT INTO anonymous_research_ingestion_failures (
         failure_id,
         idempotency_key_hash,
         payload_version,
         local_schema_version,
         app_version,
         consent_terms_version,
         category_list_json,
         received_at,
         status,
         retry_state,
         error_message,
         action_required
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        "failure_data_quality",
        "hash_only",
        "anonymous-reporting-v1",
        String(LOCAL_SCHEMA_VERSION),
        LOCAL_APP_VERSION,
        "anonymous-reporting-v1",
        JSON.stringify(["share_test_summaries"]),
        dataQualityLater,
        "rejected",
        "needs_review",
        "Synthetic validation failure",
        "Review aggregate data quality test fixture.",
      )
      .run();

    const response = await GET(dashboardRequest(admin.headers));
    expect(response.status).toBe(200);

    const body = (await response.json()) as DataQualityDashboard;
    expect(body.status).toBe("ok");
    expect(body.summary).toMatchObject({
      acceptedSubmissions: 1,
      sessions: 2,
      completedSessions: 1,
      taskRuns: 2,
      completedTaskRuns: 1,
      trialEvents: 2,
      invalidTrialEvents: 1,
    });
    expect(body.summary.sessionCompletionRate).toBe(0.5);
    expect(body.summary.taskRunCompletionRate).toBe(0.5);
    expect(body.summary.invalidTrialRate).toBe(0.5);
    expect(body.privacy).toMatchObject({
      aggregateOnly: true,
      minimumCohortSize: 5,
      smallCellThreshold: 3,
      externalRelease: "blocked_small_cohort",
      smallCellSuppressed: true,
      suppressedDistributionCells: 4,
    });

    expect(body.dropOffByTest).toContainEqual({
      taskId: "memory_span",
      startedRuns: 1,
      completedRuns: 0,
      droppedRuns: 1,
      completionRate: 0,
      dropOffRate: 1,
    });
    expect(body.medianTaskDurationByTask).toContainEqual({
      taskId: "simple_reaction_time",
      completedRuns: 1,
      medianDurationSeconds: 300,
    });
    expect(body.qualityFlagFrequency).toContainEqual({
      flag: "too_fast",
      count: 1,
    });
    expect(body.qualityFlagFrequency).toContainEqual({
      flag: "unknown_quality_flag",
      count: 1,
    });
    expect(body.deviceDistribution).toEqual([
      {
        value: "small_cell_suppressed",
        count: 2,
        share: 1,
        suppressed: true,
      },
    ]);
    expect(body.inputDistribution).toEqual([
      {
        value: "small_cell_suppressed",
        count: 2,
        share: 1,
        suppressed: true,
      },
    ]);
    expect(body.missingQuestionnaireFields).toContainEqual({
      questionnaireId: "demographics_v1",
      questionId: "birth_year",
      label: "Birth year",
      expectedCount: 1,
      answeredCount: 0,
      missingCount: 1,
      completionRate: 0,
    });
    expect(body.uploadRetries).toMatchObject({
      failedUploads: 1,
      pendingReview: 1,
      retryStateFrequency: [{ retryState: "needs_review", count: 1 }],
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("study_data_quality_hidden");
    expect(serialized).not.toContain(payload.idempotencyKey);
    expect(serialized).not.toContain("session_data_quality");
    expect(serialized).not.toContain("task_run_data_quality");
    expect(serialized).not.toContain("trial_event_data_quality");
    expect(serialized).not.toContain("answer_data_quality_secret");
    expect(serialized).not.toContain("sensitive-answer-value");
    expect(serialized).not.toContain("participant-secret@example.com");
  });
});

async function signUp(email: string, role: "admin" | "user") {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Data Quality", email, password: PASSWORD },
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

function dashboardRequest(headers = new Headers()) {
  return new Request("https://senex.nz/api/admin/data-quality", {
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
