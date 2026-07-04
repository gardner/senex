import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/reporting/anonymous/submit/route";
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
  type TrialEventRecord,
} from "@/lib/local/schema";

const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";
const profileId = "profile_ingestion";

describe("anonymous reporting ingestion", () => {
  it("stores accepted submissions append-only and treats duplicate idempotency keys as success", async () => {
    const payload = acceptedPayload("study_accept");

    const created = await submit(payload);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      status: "accepted",
      idempotencyKey: payload.idempotencyKey,
    });

    const duplicate = await submit(payload);
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toMatchObject({
      status: "duplicate",
      idempotencyKey: payload.idempotencyKey,
    });

    const row = await env.DB.prepare(
      `SELECT anonymous_study_id, idempotency_key, category_list_json
       FROM anonymous_research_submissions
       WHERE idempotency_key = ?`,
    )
      .bind(payload.idempotencyKey)
      .first<{
        anonymous_study_id: string;
        idempotency_key: string;
        category_list_json: string;
      }>();

    expect(row).toMatchObject({
      anonymous_study_id: "study_accept",
      idempotency_key: payload.idempotencyKey,
    });
    expect(JSON.parse(row!.category_list_json)).toEqual([
      "share_test_summaries",
    ]);

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM anonymous_research_submissions WHERE idempotency_key = ?",
    )
      .bind(payload.idempotencyKey)
      .first<{ count: number }>();
    expect(count?.count).toBe(1);

    const normalized = await env.DB.prepare(
      `SELECT category, record_type
       FROM anonymous_research_submission_records
       WHERE submission_id = ?
       ORDER BY record_type`,
    )
      .bind(`anonymous_submission_${payload.idempotencyKey}`)
      .all<{ category: string; record_type: string }>();
    expect(normalized.results).toEqual([
      { category: "share_test_summaries", record_type: "scores" },
      { category: "share_test_summaries", record_type: "sessionSummaries" },
      { category: "share_test_summaries", record_type: "taskRunSummaries" },
    ]);
  });

  it("rejects payload data outside the consent snapshot", async () => {
    const payload = acceptedPayload("study_reject");
    const malicious = structuredClone(payload) as typeof payload;
    malicious.idempotencyKey = `${payload.idempotencyKey}_malicious`;
    malicious.includedCategories = [
      ...malicious.includedCategories,
      "share_trial_level_data",
    ];
    malicious.data.trialEvents = [fixtureTrialEvent()];

    const rejected = await submit(malicious);
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toMatchObject({
      status: "rejected",
      error: expect.stringContaining("share_trial_level_data"),
    });

    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM anonymous_research_submissions WHERE idempotency_key = ?",
    )
      .bind(malicious.idempotencyKey)
      .first<{ count: number }>();
    expect(count?.count).toBe(0);
  });
});

async function submit(payload: unknown) {
  return POST(
    new Request("https://senex.nz/api/reporting/anonymous/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

function acceptedPayload(anonymousStudyId: string) {
  return buildAnonymousReportingPayload({
    identity: createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId,
      createdAt: now,
    }),
    consentRecords: [
      createAnonymousConsentRecord({
        profileId,
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
      sessionId: "session_ingest",
      profileId,
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
      taskRunId: "task_run_ingest",
      sessionId: "session_ingest",
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
      scoreId: "score_ingest",
      sessionId: "session_ingest",
      taskRunId: "task_run_ingest",
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
    trialEvents: [],
    scores,
    questionnaireAnswers: [],
  };
}

function fixtureTrialEvent(): TrialEventRecord {
  return {
    trialEventId: "trial_malicious",
    taskRunId: "task_run_ingest",
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
