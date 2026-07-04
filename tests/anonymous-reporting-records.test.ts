import { describe, expect, it } from "vitest";

import {
  buildAnonymousReportingPayload,
  createAnonymousConsentRecord,
  createAnonymousIdentityRecord,
  createReportingUploadRecord,
  pauseAnonymousIdentityRecord,
  resetAnonymousIdentityRecord,
  stopAnonymousIdentityRecord,
} from "@/lib/anonymous-reporting";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  assertAnonymousIdentityRecord,
  assertReportingUploadRecord,
  type LocalSession,
  type ScoreRecord,
  type TaskRunRecord,
} from "@/lib/local/schema";

const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";
const profileId = "profile_reporting";

describe("anonymous study identity and upload queue records", () => {
  it("keeps a stable local study ID and records pause, stop, and reset lifecycle", () => {
    const identity = createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId: "study_original",
      createdAt: now,
    });
    expect(identity.status).toBe("active");
    expect(() => assertAnonymousIdentityRecord(identity)).not.toThrow();

    const paused = pauseAnonymousIdentityRecord(identity, later);
    expect(paused.status).toBe("paused");

    const stopped = stopAnonymousIdentityRecord(paused, later);
    expect(stopped.status).toBe("stopped");
    expect(stopped.stoppedAt).toBe(later);

    const reset = resetAnonymousIdentityRecord(stopped, {
      anonymousStudyId: "study_reset",
      createdAt: later,
    });
    expect(reset.oldIdentity.status).toBe("stopped");
    expect(reset.newIdentity.anonymousStudyId).toBe("study_reset");
    expect(reset.newIdentity.previousAnonymousStudyId).toBe("study_original");
  });

  it("creates inspectable queued uploads with a consent snapshot and idempotency key", () => {
    const identity = createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId: "study_123",
      createdAt: now,
    });
    const consentRecords = [
      createAnonymousConsentRecord({
        profileId,
        category: "share_test_summaries",
        decision: "granted",
        decidedAt: now,
        sourceScreen: "reporting_center",
      }),
    ];
    const payload = buildAnonymousReportingPayload({
      identity,
      consentRecords,
      localData: fixtureSummaryData(),
      scope: { type: "all_existing_history" },
      generatedAt: now,
    });

    const upload = createReportingUploadRecord({
      profileId,
      payload,
      queuedAt: later,
    });

    expect(upload).toMatchObject({
      profileId,
      anonymousStudyId: "study_123",
      status: "queued",
      idempotencyKey: payload.idempotencyKey,
      payload,
      consentSnapshot: payload.consentSnapshot,
      queuedAt: later,
      submittedAt: null,
      completedAt: null,
      lastError: null,
    });
    expect(() => assertReportingUploadRecord(upload)).not.toThrow();
    expect(
      createReportingUploadRecord({ profileId, payload, queuedAt: later })
        .idempotencyKey,
    ).toBe(upload.idempotencyKey);
  });
});

function fixtureSummaryData() {
  const sessions: LocalSession[] = [
    {
      sessionId: "session_1",
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
      taskRunId: "task_run_1",
      sessionId: "session_1",
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
      scoreId: "score_1",
      sessionId: "session_1",
      taskRunId: "task_run_1",
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
