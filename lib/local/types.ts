export const LOCAL_SCHEMA_VERSION = 2;
export const LOCAL_APP_VERSION = "0.1.0";

export type LocalMode = "offline" | "anonymous_reporting" | "signed_in";
export type LocalCadence = "daily" | "weekly" | "monthly" | "ad_hoc";
export type ConsentDecision = "granted" | "denied" | "withdrawn";
export type AnonymousIdentityStatus = "active" | "paused" | "stopped";
export type ReportingUploadStatus =
  | "queued"
  | "submitting"
  | "succeeded"
  | "failed";

export type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface LocalProfile {
  profileId: string;
  mode: LocalMode;
  createdAt: string;
  updatedAt: string;
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
  displayName?: string;
}

export interface LocalSession {
  sessionId: string;
  profileId: string;
  startedAt: string;
  completedAt: string | null;
  cadence: LocalCadence;
  contextSnapshot: JsonObject;
  qualityFlags: string[];
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface TaskRunRecord {
  taskRunId: string;
  sessionId: string;
  taskId: string;
  taskVersion: string;
  stimulusPackId: string;
  stimulusSeed: string;
  startedAt: string;
  completedAt: string | null;
  summaryScore: JsonObject;
  qualityFlags: string[];
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface TrialEventRecord {
  trialEventId: string;
  taskRunId: string;
  trialIndex: number;
  stimulus: JsonObject;
  expectedResponse: JsonValue;
  actualResponse: JsonValue;
  correct: boolean | null;
  stimulusOnsetTime: number;
  responseTime: number | null;
  rtMs: number | null;
  eventFlags: string[];
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface ScoreRecord {
  scoreId: string;
  sessionId: string;
  taskRunId: string;
  domain: string;
  metricName: string;
  rawValue: number;
  normalizedValue: number | null;
  confidence: number;
  qualityFlags: string[];
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface QuestionnaireAnswerRecord {
  answerId: string;
  profileId: string;
  sessionId: string | null;
  questionnaireId: string;
  questionId: string;
  answerValue: JsonValue;
  answeredAt: string;
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface ConsentRecord {
  consentRecordId: string;
  profileId: string;
  mode: LocalMode;
  consentType: string;
  version: string;
  decision: ConsentDecision;
  decidedAt: string;
  sourceScreen: string;
  dataCategories: string[];
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface AnonymousIdentityRecord {
  anonymousIdentityId: string;
  profileId: string;
  anonymousStudyId: string;
  previousAnonymousStudyId: string | null;
  status: AnonymousIdentityStatus;
  createdAt: string;
  updatedAt: string;
  pausedAt: string | null;
  stoppedAt: string | null;
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface ReportingUploadRecord {
  reportingUploadId: string;
  profileId: string;
  anonymousStudyId: string;
  idempotencyKey: string;
  status: ReportingUploadStatus;
  includedCategories: string[];
  consentSnapshot: JsonObject;
  payload: JsonObject;
  queuedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}

export interface ImportAuditRecord {
  importAuditId: string;
  profileId: string;
  importedAt: string;
  sourceSchemaVersion: number;
  sourceAppVersion: string;
  importMode: "merge" | "replace";
  recordCounts: JsonObject;
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
}
