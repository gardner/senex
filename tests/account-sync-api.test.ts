import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/account/sessions/sync/route";
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

describe("account sync API", () => {
  it("rejects unauthenticated sync requests", async () => {
    const response = await POST(syncRequest(fixturePayload("not-signed-in")));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      status: "rejected",
      error: "Authentication required.",
    });
  });

  it("rejects payloads for a different account", async () => {
    const { headers } = await signUp("mismatch@example.com");

    const response = await POST(
      syncRequest(fixturePayload("some-other-user"), headers),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      status: "rejected",
      error: "Payload accountId does not match the signed-in account.",
    });
  });

  it("stores signed-in local history idempotently for the current account", async () => {
    const { headers, userId } = await signUp("sync-owner@example.com");
    const payload = fixturePayload(userId);

    const created = await POST(syncRequest(payload, headers));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      status: "accepted",
      idempotencyKey: payload.idempotencyKey,
      syncState: {
        lastSyncBatchId: "account_sync_batch_sync_one",
        pendingConflictCount: 0,
      },
    });

    const duplicate = await POST(syncRequest(payload, headers));
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toMatchObject({
      status: "duplicate",
      idempotencyKey: payload.idempotencyKey,
      syncState: {
        lastSyncBatchId: "account_sync_batch_sync_one",
        pendingConflictCount: 0,
      },
    });

    expect(await tableCount("account_sync_batches", userId)).toBe(1);
    expect(await tableCount("account_sync_sessions", userId)).toBe(1);
    expect(await tableCount("account_sync_task_runs", userId)).toBe(1);
    expect(await tableCount("account_sync_trial_events", userId)).toBe(1);
    expect(await tableCount("account_sync_scores", userId)).toBe(1);
    expect(await tableCount("account_sync_consent_events", userId)).toBe(1);

    const session = await env.DB.prepare(
      `SELECT local_session_id, started_at, completed_at
       FROM account_sync_sessions
       WHERE user_id = ?`,
    )
      .bind(userId)
      .first<{
        local_session_id: string;
        started_at: string;
        completed_at: string;
      }>();

    expect(session).toEqual({
      local_session_id: "local_session_sync",
      started_at: now,
      completed_at: later,
    });
  });
});

async function signUp(email: string) {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Sync Owner", email, password: PASSWORD },
    returnHeaders: true,
  });
  const cookie = headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return {
    userId: response.user.id,
    headers: new Headers({ cookie: cookie! }),
  };
}

function syncRequest(payload: unknown, headers = new Headers()) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/account/sessions/sync", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
  });
}

async function tableCount(table: string, userId: string) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM "${table}" WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

function fixturePayload(accountId: string) {
  return {
    payloadVersion: "account-sync-v1",
    accountId,
    idempotencyKey: "sync_one",
    sourceProfileId: "local_profile_sync",
    generatedAt: later,
    schemaVersions: {
      local: LOCAL_SCHEMA_VERSION,
      app: LOCAL_APP_VERSION,
    },
    records: {
      sessions: [fixtureSession()],
      taskRuns: [fixtureTaskRun()],
      trialEvents: [fixtureTrialEvent()],
      scores: [fixtureScore()],
      consentEvents: [fixtureConsent()],
    },
  };
}

function fixtureSession(): LocalSession {
  return {
    sessionId: "local_session_sync",
    profileId: "local_profile_sync",
    startedAt: now,
    completedAt: later,
    cadence: "daily",
    contextSnapshot: { sleepQuality: "ok" },
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

function fixtureTaskRun(): TaskRunRecord {
  return {
    taskRunId: "local_task_run_sync",
    sessionId: "local_session_sync",
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

function fixtureTrialEvent(): TrialEventRecord {
  return {
    trialEventId: "local_trial_event_sync",
    taskRunId: "local_task_run_sync",
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

function fixtureScore(): ScoreRecord {
  return {
    scoreId: "local_score_sync",
    sessionId: "local_session_sync",
    taskRunId: "local_task_run_sync",
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

function fixtureConsent(): ConsentRecord {
  return {
    consentRecordId: "local_consent_sync",
    profileId: "local_profile_sync",
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
