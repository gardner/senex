import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { POST as POST_SYNC } from "@/app/api/account/sessions/sync/route";
import { GET as GET_EXPORT } from "@/app/api/account/export/route";
import { POST as POST_DELETION_REQUEST } from "@/app/api/account/deletion-requests/route";
import type { AccountExportBody } from "@/lib/account-data/export";
import { auth } from "@/lib/auth";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type ConsentRecord,
  type LocalSession,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "@/lib/local/schema";

const PASSWORD = "a-perfectly-fine-password";
const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";

describe("account export and deletion request API", () => {
  it("rejects unauthenticated account export and deletion requests", async () => {
    const exportResponse = await GET_EXPORT(accountRequest());
    const deletionResponse = await POST_DELETION_REQUEST(accountRequest());

    expect(exportResponse.status).toBe(401);
    expect(deletionResponse.status).toBe(401);
  });

  it("exports only the signed-in account history and consent records", async () => {
    const owner = await signUp("export-owner@example.com");
    const other = await signUp("export-other@example.com");
    await syncAccount(owner, "owner");
    await syncAccount(other, "other");

    const response = await GET_EXPORT(accountRequest(owner.headers));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = (await response.json()) as AccountExportBody;
    expect(body.exportVersion).toBe("account-export-v1");
    expect(body.account.email).toBe("export-owner@example.com");
    expect(body.records.sessions).toHaveLength(1);
    expect(body.records.sessions[0].localSessionId).toBe(
      "owner_local_session_sync",
    );
    expect(body.records.taskRuns[0].localTaskRunId).toBe(
      "owner_local_task_run_sync",
    );
    expect(body.records.trialEvents[0].localTrialEventId).toBe(
      "owner_local_trial_event_sync",
    );
    expect(body.records.scores[0].localScoreId).toBe("owner_local_score_sync");
    expect(body.records.consentEvents[0].localConsentRecordId).toBe(
      "owner_local_consent_sync",
    );
    expect(JSON.stringify(body)).not.toContain("other_local_session_sync");
    expect(body.retentionNotes.some((note) => note.scope === "research")).toBe(
      true,
    );

    const auditRows = await env.DB.prepare(
      `SELECT event_type, record_counts_json, source
       FROM account_export_audit
       WHERE user_id = ?
       ORDER BY exported_at`,
    )
      .bind(owner.userId)
      .all<{
        event_type: string;
        record_counts_json: string;
        source: string;
      }>();
    expect(auditRows.results).toEqual([
      {
        event_type: "account_export_generated",
        record_counts_json: JSON.stringify({
          sessions: 1,
          taskRuns: 1,
          trialEvents: 1,
          scores: 1,
          consentEvents: 1,
          deletionRequests: 0,
          trialContactProfile: 0,
        }),
        source: "account_export_api",
      },
    ]);
    expect(
      await exportAuditCount("export-other@example.com", other.userId),
    ).toBe(0);
  });

  it("creates an auditable idempotent account deletion request", async () => {
    const owner = await signUp("delete-request-owner@example.com");

    const first = await POST_DELETION_REQUEST(accountRequest(owner.headers));
    expect(first.status).toBe(201);
    const created = (await first.json()) as DeletionRequestResponse;
    expect(created.status).toBe("accepted");
    expect(created.deletionRequest.status).toBe("pending");
    expect(created.deletionRequest.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Already shared research submissions"),
      ]),
    );

    const duplicate = await POST_DELETION_REQUEST(
      accountRequest(owner.headers),
    );
    expect(duplicate.status).toBe(200);
    const existing = (await duplicate.json()) as DeletionRequestResponse;
    expect(existing.status).toBe("existing");
    expect(existing.deletionRequest.requestId).toBe(
      created.deletionRequest.requestId,
    );

    const row = await env.DB.prepare(
      `SELECT status, scope_json
       FROM account_deletion_requests
       WHERE user_id = ?`,
    )
      .bind(owner.userId)
      .first<{ status: string; scope_json: string }>();
    expect(row?.status).toBe("pending");
    expect(JSON.parse(row?.scope_json ?? "{}")).toMatchObject({
      accountLinkedData: expect.arrayContaining(["account_sync_sessions"]),
      notAutomaticallyDeleted: expect.arrayContaining([
        "anonymous_research_submissions",
      ]),
    });
  });
});

type DeletionRequestResponse = {
  status: "accepted" | "existing";
  deletionRequest: { requestId: string; status: string; limitations: string[] };
};

async function signUp(email: string) {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Account Data Owner", email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return {
    userId: response.user.id,
    headers: new Headers({ cookie: cookie! }),
  };
}

async function syncAccount(
  user: Awaited<ReturnType<typeof signUp>>,
  prefix: string,
) {
  const response = await POST_SYNC(
    syncRequest(fixturePayload(user.userId, prefix), user.headers),
  );
  expect(response.status).toBe(201);
}

function accountRequest(headers = new Headers()) {
  return new Request("https://senex.nz/api/account/export", {
    method: "GET",
    headers,
  });
}

async function exportAuditCount(email: string, userId: string) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM account_export_audit audit
     JOIN "user" owner ON owner.id = audit.user_id
     WHERE owner.email = ? AND audit.user_id = ?`,
  )
    .bind(email, userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

function syncRequest(payload: unknown, headers: Headers) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/account/sessions/sync", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
  });
}

function fixturePayload(accountId: string, prefix: string) {
  return {
    payloadVersion: "account-sync-v1",
    accountId,
    idempotencyKey: `${prefix}_sync_one`,
    sourceProfileId: `${prefix}_local_profile_sync`,
    generatedAt: later,
    schemaVersions: {
      local: LOCAL_SCHEMA_VERSION,
      app: LOCAL_APP_VERSION,
    },
    records: {
      sessions: [fixtureSession(prefix)],
      taskRuns: [fixtureTaskRun(prefix)],
      trialEvents: [fixtureTrialEvent(prefix)],
      scores: [fixtureScore(prefix)],
      consentEvents: [fixtureConsent(prefix)],
    },
  };
}

function fixtureSession(prefix: string): LocalSession {
  return {
    sessionId: `${prefix}_local_session_sync`,
    profileId: `${prefix}_local_profile_sync`,
    startedAt: now,
    completedAt: later,
    cadence: "daily",
    contextSnapshot: { sleepQuality: "ok" },
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

function fixtureTaskRun(prefix: string): TaskRunRecord {
  return {
    taskRunId: `${prefix}_local_task_run_sync`,
    sessionId: `${prefix}_local_session_sync`,
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
  };
}

function fixtureTrialEvent(prefix: string): TrialEventRecord {
  return {
    trialEventId: `${prefix}_local_trial_event_sync`,
    taskRunId: `${prefix}_local_task_run_sync`,
    trialIndex: 0,
    stimulus: { shape: "circle" },
    expectedResponse: "space",
    actualResponse: "space",
    correct: true,
    stimulusOnsetTime: 1000,
    responseTime: 1412,
    rtMs: 412,
    eventFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

function fixtureScore(prefix: string): ScoreRecord {
  return {
    scoreId: `${prefix}_local_score_sync`,
    sessionId: `${prefix}_local_session_sync`,
    taskRunId: `${prefix}_local_task_run_sync`,
    domain: "reaction_speed",
    metricName: "median_rt_ms",
    rawValue: 412,
    normalizedValue: null,
    confidence: 0.9,
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

function fixtureConsent(prefix: string): ConsentRecord {
  return {
    consentRecordId: `${prefix}_local_consent_sync`,
    profileId: `${prefix}_local_profile_sync`,
    mode: "signed_in",
    consentType: "research_data_sharing",
    version: "2026-07-04",
    decision: "granted",
    decidedAt: now,
    sourceScreen: "account_sync",
    dataCategories: ["share_test_summaries"],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}
