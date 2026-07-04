import {
  type ConsentRecord,
  type ImportAuditRecord,
  type LocalProfile,
  type LocalSession,
  type QuestionnaireAnswerRecord,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "./types";
import {
  asRecord,
  expectBase,
  expectBooleanOrNull,
  expectEnum,
  expectFiniteNumber,
  expectInteger,
  expectIso,
  expectJson,
  expectJsonObject,
  expectNonEmptyString,
  expectNullableIso,
  expectNullableNumber,
  expectStringArray,
  expectStringOrNull,
  fail,
} from "./validation-utils";

export function assertLocalProfile(
  value: unknown,
): asserts value is LocalProfile {
  const record = asRecord(value, "LocalProfile");
  expectNonEmptyString(record, "profileId", "LocalProfile");
  expectEnum(
    record,
    "mode",
    ["offline", "anonymous_reporting", "signed_in"],
    "LocalProfile",
  );
  expectIso(record, "createdAt", "LocalProfile");
  expectIso(record, "updatedAt", "LocalProfile");
  expectBase(record, "LocalProfile");
  if (record.displayName !== undefined)
    expectNonEmptyString(record, "displayName", "LocalProfile");
}

export function assertLocalSession(
  value: unknown,
): asserts value is LocalSession {
  const record = asRecord(value, "LocalSession");
  expectNonEmptyString(record, "sessionId", "LocalSession");
  expectNonEmptyString(record, "profileId", "LocalSession");
  expectIso(record, "startedAt", "LocalSession");
  expectNullableIso(record, "completedAt", "LocalSession");
  expectEnum(
    record,
    "cadence",
    ["daily", "weekly", "monthly", "ad_hoc"],
    "LocalSession",
  );
  expectJsonObject(record, "contextSnapshot", "LocalSession");
  expectStringArray(record, "qualityFlags", "LocalSession");
  expectBase(record, "LocalSession");
}

export function assertTaskRunRecord(
  value: unknown,
): asserts value is TaskRunRecord {
  const record = asRecord(value, "TaskRunRecord");
  for (const field of [
    "taskRunId",
    "sessionId",
    "taskId",
    "taskVersion",
    "stimulusPackId",
    "stimulusSeed",
  ]) {
    expectNonEmptyString(record, field, "TaskRunRecord");
  }
  expectIso(record, "startedAt", "TaskRunRecord");
  expectNullableIso(record, "completedAt", "TaskRunRecord");
  expectJsonObject(record, "summaryScore", "TaskRunRecord");
  expectStringArray(record, "qualityFlags", "TaskRunRecord");
  expectBase(record, "TaskRunRecord");
}

export function assertTrialEventRecord(
  value: unknown,
): asserts value is TrialEventRecord {
  const record = asRecord(value, "TrialEventRecord");
  expectNonEmptyString(record, "trialEventId", "TrialEventRecord");
  expectNonEmptyString(record, "taskRunId", "TrialEventRecord");
  expectInteger(record, "trialIndex", "TrialEventRecord");
  expectJsonObject(record, "stimulus", "TrialEventRecord");
  expectJson(record.expectedResponse, "TrialEventRecord.expectedResponse");
  expectJson(record.actualResponse, "TrialEventRecord.actualResponse");
  expectBooleanOrNull(record, "correct", "TrialEventRecord");
  expectFiniteNumber(record, "stimulusOnsetTime", "TrialEventRecord");
  expectNullableNumber(record, "responseTime", "TrialEventRecord");
  expectNullableNumber(record, "rtMs", "TrialEventRecord");
  expectStringArray(record, "eventFlags", "TrialEventRecord");
  expectBase(record, "TrialEventRecord");
}

export function assertScoreRecord(
  value: unknown,
): asserts value is ScoreRecord {
  const record = asRecord(value, "ScoreRecord");
  for (const field of [
    "scoreId",
    "sessionId",
    "taskRunId",
    "domain",
    "metricName",
  ]) {
    expectNonEmptyString(record, field, "ScoreRecord");
  }
  expectFiniteNumber(record, "rawValue", "ScoreRecord");
  expectNullableNumber(record, "normalizedValue", "ScoreRecord");
  expectFiniteNumber(record, "confidence", "ScoreRecord");
  const confidence = record.confidence as number;
  if (confidence < 0 || confidence > 1)
    fail("ScoreRecord.confidence must be between 0 and 1");
  expectStringArray(record, "qualityFlags", "ScoreRecord");
  expectBase(record, "ScoreRecord");
}

export function assertQuestionnaireAnswerRecord(
  value: unknown,
): asserts value is QuestionnaireAnswerRecord {
  const record = asRecord(value, "QuestionnaireAnswerRecord");
  for (const field of [
    "answerId",
    "profileId",
    "questionnaireId",
    "questionId",
  ]) {
    expectNonEmptyString(record, field, "QuestionnaireAnswerRecord");
  }
  expectStringOrNull(record, "sessionId", "QuestionnaireAnswerRecord");
  expectJson(record.answerValue, "QuestionnaireAnswerRecord.answerValue");
  expectIso(record, "answeredAt", "QuestionnaireAnswerRecord");
  expectBase(record, "QuestionnaireAnswerRecord");
}

export function assertConsentRecord(
  value: unknown,
): asserts value is ConsentRecord {
  const record = asRecord(value, "ConsentRecord");
  expectNonEmptyString(record, "consentRecordId", "ConsentRecord");
  expectNonEmptyString(record, "profileId", "ConsentRecord");
  expectEnum(
    record,
    "mode",
    ["offline", "anonymous_reporting", "signed_in"],
    "ConsentRecord",
  );
  expectNonEmptyString(record, "consentType", "ConsentRecord");
  expectNonEmptyString(record, "version", "ConsentRecord");
  expectEnum(
    record,
    "decision",
    ["granted", "denied", "withdrawn"],
    "ConsentRecord",
  );
  expectIso(record, "decidedAt", "ConsentRecord");
  expectStringArray(record, "dataCategories", "ConsentRecord");
  expectBase(record, "ConsentRecord");
}

export function assertImportAuditRecord(
  value: unknown,
): asserts value is ImportAuditRecord {
  const record = asRecord(value, "ImportAuditRecord");
  expectNonEmptyString(record, "importAuditId", "ImportAuditRecord");
  expectNonEmptyString(record, "profileId", "ImportAuditRecord");
  expectIso(record, "importedAt", "ImportAuditRecord");
  expectInteger(record, "sourceSchemaVersion", "ImportAuditRecord");
  expectNonEmptyString(record, "sourceAppVersion", "ImportAuditRecord");
  expectEnum(record, "importMode", ["merge", "replace"], "ImportAuditRecord");
  expectJsonObject(record, "recordCounts", "ImportAuditRecord");
  expectBase(record, "ImportAuditRecord");
}
