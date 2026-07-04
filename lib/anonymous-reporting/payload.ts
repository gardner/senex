import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type AnonymousIdentityRecord,
} from "@/lib/local/schema";

import { deriveActiveConsent } from "./consent";
import {
  CONSENT_CATEGORY_IDS,
  type AnonymousReportingLocalData,
  type AnonymousReportingPayload,
  type AnonymousReportingPayloadData,
  type AnonymousReportingScope,
  type ConsentCategoryId,
} from "./types";

export function buildAnonymousReportingPayload(input: {
  identity: AnonymousIdentityRecord;
  consentRecords: Parameters<typeof deriveActiveConsent>[0];
  localData: AnonymousReportingLocalData;
  scope: AnonymousReportingScope;
  generatedAt: string;
}): AnonymousReportingPayload {
  const consent = deriveActiveConsent(input.consentRecords);
  const includedCategories = CONSENT_CATEGORY_IDS.filter(
    (category) => consent.decisions[category] === "granted",
  );
  const scoped = scopeLocalData(input.localData, input.scope);
  const data = buildPayloadData(scoped, includedCategories);
  const withoutKey = {
    payloadVersion: "anonymous-reporting-v1" as const,
    anonymousStudyId: input.identity.anonymousStudyId,
    identityStatus: input.identity.status,
    generatedAt: input.generatedAt,
    scope: input.scope,
    includedCategories,
    consentSnapshot: {
      termsVersion: consent.termsVersion,
      decisions: consent.decisions,
      grantedCategories: consent.grantedCategories,
      latestRecordIds: consent.latestRecordIds,
    },
    data,
    schemaVersions: {
      local: LOCAL_SCHEMA_VERSION,
      app: LOCAL_APP_VERSION,
    },
  };

  return {
    ...withoutKey,
    idempotencyKey: `anonymous_${stableHash(stableStringify(withoutKey))}`,
  };
}

function buildPayloadData(
  localData: AnonymousReportingLocalData,
  includedCategories: ConsentCategoryId[],
): AnonymousReportingPayloadData {
  const data: AnonymousReportingPayloadData = {};
  if (includedCategories.includes("share_test_summaries")) {
    data.sessionSummaries = localData.sessions.map((session) => ({
      sessionId: session.sessionId,
      profileId: session.profileId,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      cadence: session.cadence,
      qualityFlags: session.qualityFlags,
    }));
    data.taskRunSummaries = localData.taskRuns.map((taskRun) => ({
      taskRunId: taskRun.taskRunId,
      sessionId: taskRun.sessionId,
      taskId: taskRun.taskId,
      taskVersion: taskRun.taskVersion,
      stimulusPackId: taskRun.stimulusPackId,
      startedAt: taskRun.startedAt,
      completedAt: taskRun.completedAt,
      summaryScore: taskRun.summaryScore,
      qualityFlags: taskRun.qualityFlags,
    }));
    data.scores = localData.scores;
  }
  if (includedCategories.includes("share_trial_level_data")) {
    data.trialEvents = localData.trialEvents;
  }
  if (includedCategories.includes("share_session_context")) {
    data.sessionContext = localData.sessions.map((session) => ({
      sessionId: session.sessionId,
      contextSnapshot: session.contextSnapshot,
      qualityFlags: session.qualityFlags,
    }));
  }
  if (includedCategories.includes("share_demographics")) {
    data.demographics = localData.questionnaireAnswers.filter(isDemographic);
  }
  if (includedCategories.includes("share_questionnaires")) {
    data.questionnaireAnswers =
      localData.questionnaireAnswers.filter(isNotDemographic);
  }
  return data;
}

function scopeLocalData(
  localData: AnonymousReportingLocalData,
  scope: AnonymousReportingScope,
): AnonymousReportingLocalData {
  if (scope.type === "all_existing_history") return localData;

  const sessions = localData.sessions.filter((session) =>
    sessionInScope(session.startedAt, scope),
  );
  const sessionIds = new Set(sessions.map((session) => session.sessionId));
  const taskRuns = localData.taskRuns.filter((taskRun) =>
    sessionIds.has(taskRun.sessionId),
  );
  const taskRunIds = new Set(taskRuns.map((taskRun) => taskRun.taskRunId));
  return {
    sessions,
    taskRuns,
    trialEvents: localData.trialEvents.filter((event) =>
      taskRunIds.has(event.taskRunId),
    ),
    scores: localData.scores.filter(
      (score) =>
        sessionIds.has(score.sessionId) && taskRunIds.has(score.taskRunId),
    ),
    questionnaireAnswers: localData.questionnaireAnswers.filter(
      (answer) => answer.sessionId === null || sessionIds.has(answer.sessionId),
    ),
  };
}

function sessionInScope(startedAt: string, scope: AnonymousReportingScope) {
  if (scope.type === "from_today")
    return startedAt.slice(0, 10) === scope.today;
  if (scope.type === "date_range") {
    return startedAt >= scope.from && startedAt <= scope.to;
  }
  return true;
}

function isDemographic(answer: { questionnaireId: string }) {
  return answer.questionnaireId === "demographics_v1";
}

function isNotDemographic(answer: { questionnaireId: string }) {
  return !isDemographic(answer);
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).toSorted(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, next]) => `${JSON.stringify(key)}:${stableStringify(next)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
