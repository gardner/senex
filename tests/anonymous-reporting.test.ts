import { describe, expect, it } from "vitest";

import {
  CONSENT_CATEGORIES,
  CONSENT_TERMS_VERSION,
  buildAnonymousReportingPayload,
  createAnonymousConsentRecord,
  createAnonymousIdentityRecord,
  deriveActiveConsent,
  validateAnonymousReportingPayload,
} from "@/lib/anonymous-reporting";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  assertConsentRecord,
  type LocalSession,
  type QuestionnaireAnswerRecord,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "@/lib/local/schema";

const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";
const profileId = "profile_reporting";

describe("anonymous reporting consent", () => {
  it("defines granular consent categories and derives the latest append-only decision", () => {
    expect(CONSENT_CATEGORIES.map((category) => category.id)).toEqual([
      "share_test_summaries",
      "share_trial_level_data",
      "share_session_context",
      "share_demographics",
      "share_questionnaires",
      "allow_longitudinal_research_use",
      "allow_approved_partner_access",
    ]);

    const grant = createAnonymousConsentRecord({
      profileId,
      category: "share_test_summaries",
      decision: "granted",
      decidedAt: now,
      sourceScreen: "reporting_center",
    });
    const withdrawal = createAnonymousConsentRecord({
      profileId,
      category: "share_test_summaries",
      decision: "withdrawn",
      decidedAt: later,
      sourceScreen: "reporting_center",
    });

    expect(grant).toMatchObject({
      profileId,
      mode: "anonymous_reporting",
      consentType: "share_test_summaries",
      version: CONSENT_TERMS_VERSION,
      sourceScreen: "reporting_center",
      dataCategories: ["share_test_summaries"],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    });
    expect(() => assertConsentRecord(grant)).not.toThrow();

    const active = deriveActiveConsent([grant, withdrawal]);
    expect(active.decisions.share_test_summaries).toBe("withdrawn");
    expect(active.decisions.share_trial_level_data).toBe("missing");
    expect(active.grantedCategories).toEqual([]);
    expect(active.history).toEqual([grant, withdrawal]);
  });
});

describe("anonymous reporting payloads", () => {
  it("defaults missing consent to not uploadable and gates every data category", () => {
    const identity = createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId: "study_123",
      createdAt: now,
    });
    const localData = fixtureLocalData();
    const withoutConsent = buildAnonymousReportingPayload({
      identity,
      consentRecords: [],
      localData,
      scope: { type: "all_existing_history" },
      generatedAt: now,
    });

    expect(withoutConsent.includedCategories).toEqual([]);
    expect(withoutConsent.data).toEqual({});
    expect(JSON.stringify(withoutConsent)).not.toContain("quiet room");

    const consentRecords = [
      createAnonymousConsentRecord({
        profileId,
        category: "share_test_summaries",
        decision: "granted",
        decidedAt: now,
        sourceScreen: "reporting_center",
      }),
      createAnonymousConsentRecord({
        profileId,
        category: "allow_longitudinal_research_use",
        decision: "granted",
        decidedAt: now,
        sourceScreen: "reporting_center",
      }),
    ];

    const payload = buildAnonymousReportingPayload({
      identity,
      consentRecords,
      localData,
      scope: { type: "all_existing_history" },
      generatedAt: now,
    });

    expect(payload.includedCategories).toEqual([
      "share_test_summaries",
      "allow_longitudinal_research_use",
    ]);
    expect(payload.data.sessionSummaries).toEqual([
      {
        sessionId: "session_1",
        profileId,
        startedAt: now,
        completedAt: later,
        cadence: "daily",
        qualityFlags: [],
      },
    ]);
    expect(payload.data.taskRunSummaries).toHaveLength(1);
    expect(payload.data.scores).toHaveLength(1);
    expect(payload.data.trialEvents).toBeUndefined();
    expect(payload.data.sessionContext).toBeUndefined();
    expect(payload.data.questionnaireAnswers).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("quiet room");

    const duplicate = buildAnonymousReportingPayload({
      identity,
      consentRecords,
      localData,
      scope: { type: "all_existing_history" },
      generatedAt: now,
    });
    expect(duplicate.idempotencyKey).toBe(payload.idempotencyKey);
  });

  it("filters local history by requested reporting scope before category gating", () => {
    const identity = createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId: "study_scope",
      createdAt: now,
    });
    const localData = fixtureLocalData();
    localData.sessions.push({
      ...localData.sessions[0],
      sessionId: "session_old",
      startedAt: "2026-06-01T00:00:00.000Z",
      completedAt: "2026-06-01T00:05:00.000Z",
    });
    localData.taskRuns.push({
      ...localData.taskRuns[0],
      taskRunId: "task_run_old",
      sessionId: "session_old",
    });
    localData.scores.push({
      ...localData.scores[0],
      scoreId: "score_old",
      sessionId: "session_old",
      taskRunId: "task_run_old",
    });

    const payload = buildAnonymousReportingPayload({
      identity,
      consentRecords: [
        createAnonymousConsentRecord({
          profileId,
          category: "share_test_summaries",
          decision: "granted",
          decidedAt: now,
          sourceScreen: "reporting_center",
        }),
      ],
      localData,
      scope: {
        type: "date_range",
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T23:59:59.999Z",
      },
      generatedAt: now,
    });

    expect(
      payload.data.sessionSummaries?.map((session) => session.sessionId),
    ).toEqual(["session_1"]);
    expect(payload.data.taskRunSummaries?.map((run) => run.taskRunId)).toEqual([
      "task_run_1",
    ]);
    expect(payload.data.scores?.map((score) => score.scoreId)).toEqual([
      "score_1",
    ]);
  });

  it("rejects unknown consent categories instead of silently dropping them", () => {
    const identity = createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId: "study_unknown",
      createdAt: now,
    });
    const payload = buildAnonymousReportingPayload({
      identity,
      consentRecords: [],
      localData: fixtureLocalData(),
      scope: { type: "all_existing_history" },
      generatedAt: now,
    });
    const malicious = {
      ...payload,
      includedCategories: ["share_test_summaries", "unknown_category"],
    };

    expect(() => validateAnonymousReportingPayload(malicious)).toThrow(
      /unknown consent category/i,
    );
  });
});

function fixtureLocalData() {
  const sessions: LocalSession[] = [
    {
      sessionId: "session_1",
      profileId,
      startedAt: now,
      completedAt: later,
      cadence: "daily",
      contextSnapshot: { notes: "quiet room" },
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
  const trialEvents: TrialEventRecord[] = [
    {
      trialEventId: "trial_1",
      taskRunId: "task_run_1",
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
  const questionnaireAnswers: QuestionnaireAnswerRecord[] = [
    {
      answerId: "answer_1",
      profileId,
      sessionId: "session_1",
      questionnaireId: "baseline_setup_v1",
      questionId: "sleep_last_night",
      answerValue: "7-8_hours",
      answeredAt: now,
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
  return { sessions, taskRuns, trialEvents, scores, questionnaireAnswers };
}
