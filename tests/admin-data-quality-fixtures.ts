import {
  buildAnonymousReportingPayload,
  createAnonymousConsentRecord,
  createAnonymousIdentityRecord,
  type ConsentCategoryId,
} from "@/lib/anonymous-reporting";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type LocalSession,
  type QuestionnaireAnswerRecord,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "@/lib/local/schema";

export const dataQualityNow = "2026-07-04T00:00:00.000Z";
export const dataQualityLater = "2026-07-04T00:05:00.000Z";

const profileId = "profile_data_quality";

export function acceptedDataQualityPayload(anonymousStudyId: string) {
  const categories: ConsentCategoryId[] = [
    "share_test_summaries",
    "share_trial_level_data",
    "share_session_context",
    "share_demographics",
    "share_questionnaires",
  ];
  return buildAnonymousReportingPayload({
    identity: createAnonymousIdentityRecord({
      profileId,
      anonymousStudyId,
      createdAt: dataQualityNow,
    }),
    consentRecords: categories.map((category) =>
      createAnonymousConsentRecord({
        profileId,
        category,
        decision: "granted",
        decidedAt: dataQualityNow,
        sourceScreen: "reporting_center",
      }),
    ),
    localData: fixtureLocalData(),
    scope: { type: "all_existing_history" },
    generatedAt: dataQualityNow,
  });
}

function fixtureLocalData() {
  const sessions: LocalSession[] = [
    {
      sessionId: "session_data_quality_done",
      profileId,
      startedAt: dataQualityNow,
      completedAt: dataQualityLater,
      cadence: "daily",
      contextSnapshot: { deviceType: "desktop", inputMethod: "keyboard" },
      qualityFlags: [],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
    {
      sessionId: "session_data_quality_drop",
      profileId,
      startedAt: dataQualityNow,
      completedAt: null,
      cadence: "daily",
      contextSnapshot: {},
      qualityFlags: ["interrupted"],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
  const taskRuns: TaskRunRecord[] = [
    {
      taskRunId: "task_run_data_quality_done",
      sessionId: "session_data_quality_done",
      taskId: "simple_reaction_time",
      taskVersion: "1.0.0",
      stimulusPackId: "pack_1",
      stimulusSeed: "seed_1",
      startedAt: dataQualityNow,
      completedAt: dataQualityLater,
      summaryScore: { medianRtMs: 412 },
      qualityFlags: [],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
    {
      taskRunId: "task_run_data_quality_drop",
      sessionId: "session_data_quality_drop",
      taskId: "memory_span",
      taskVersion: "1.0.0",
      stimulusPackId: "pack_2",
      stimulusSeed: "seed_2",
      startedAt: dataQualityNow,
      completedAt: null,
      summaryScore: {},
      qualityFlags: ["interrupted", "participant-secret@example.com"],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
  const scores: ScoreRecord[] = [
    {
      scoreId: "score_data_quality",
      sessionId: "session_data_quality_done",
      taskRunId: "task_run_data_quality_done",
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
    trialEvents: fixtureTrialEvents(),
    questionnaireAnswers: fixtureQuestionnaireAnswers(),
  };
}

function fixtureTrialEvents(): TrialEventRecord[] {
  return [
    {
      trialEventId: "trial_event_data_quality_valid",
      taskRunId: "task_run_data_quality_done",
      trialIndex: 0,
      stimulus: { kind: "circle" },
      expectedResponse: "space",
      actualResponse: "space",
      correct: true,
      stimulusOnsetTime: 10,
      responseTime: 420,
      rtMs: 410,
      eventFlags: ["input_keyboard", "phase_study"],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
    {
      trialEventId: "trial_event_data_quality_flagged",
      taskRunId: "task_run_data_quality_done",
      trialIndex: 1,
      stimulus: { kind: "square" },
      expectedResponse: "space",
      actualResponse: "space",
      correct: true,
      stimulusOnsetTime: 20,
      responseTime: 25,
      rtMs: 5,
      eventFlags: ["too_fast"],
      schemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  ];
}

function fixtureQuestionnaireAnswers(): QuestionnaireAnswerRecord[] {
  return [
    answer("demographics_v1", "country_region", "NZ"),
    answer("demographics_v1", "primary_language", "English"),
    answer("device_familiarity_v1", "browser_comfort", 4),
    answer("sleep_stress_baseline_v1", "typical_sleep_quality", 3),
    answer("sleep_stress_baseline_v1", "typical_stress", 2),
    answer("cognitive_concerns_v1", "memory_concerns", "prefer_not_to_say"),
    answer("general_health_context_v1", "general_health_rating", 4),
    answer(
      "session_context_v1",
      "session_context_notes",
      "sensitive-answer-value",
    ),
  ];
}

function answer(
  questionnaireId: string,
  questionId: string,
  answerValue: QuestionnaireAnswerRecord["answerValue"],
): QuestionnaireAnswerRecord {
  return {
    answerId: `answer_data_quality_secret_${questionnaireId}_${questionId}`,
    profileId,
    sessionId: null,
    questionnaireId,
    questionnaireVersion: "2026-07-04",
    questionId,
    questionVersion: "1",
    answerValue,
    answerStatus: "answered",
    answeredAt: dataQualityNow,
    sourceScreen: "research_profile",
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}
