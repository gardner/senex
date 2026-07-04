import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type AnonymousIdentityRecord,
  type ConsentRecord,
  type ImportAuditRecord,
  type LocalProfile,
  type LocalSession,
  type QuestionnaireAnswerRecord,
  type ReportingUploadRecord,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "./types";
import {
  expectEnum,
  expectIso,
  expectNonEmptyString,
  expectStringOrNull,
  fail,
} from "./validation-utils";
import {
  assertAnonymousIdentityRecord,
  assertConsentRecord,
  assertImportAuditRecord,
  assertLocalProfile,
  assertLocalSession,
  assertQuestionnaireAnswerRecord,
  assertReportingUploadRecord,
  assertScoreRecord,
  assertTaskRunRecord,
  assertTrialEventRecord,
} from "./validators";
import {
  assertStimulusReferencesMatchTaskRuns,
  stimulusReferenceForTask,
} from "./stimulus-references";

export const EXPORT_SCHEMA_VERSION = 1;
export const EXPORT_FORMAT = "senex.local-backup";

export interface StimulusReference {
  taskRunId: string;
  taskId: string;
  taskVersion: string;
  stimulusPackId: string;
  stimulusSeed: string;
}

export interface ExportableLocalRecords {
  profiles: LocalProfile[];
  sessions: LocalSession[];
  taskRuns: TaskRunRecord[];
  trialEvents: TrialEventRecord[];
  scores: ScoreRecord[];
  questionnaireAnswers: QuestionnaireAnswerRecord[];
  consentRecords: ConsentRecord[];
  anonymousIdentities: AnonymousIdentityRecord[];
  reportingUploads: ReportingUploadRecord[];
  importAudits: ImportAuditRecord[];
}

export interface LocalExportEnvelope {
  format: typeof EXPORT_FORMAT;
  exportSchemaVersion: typeof EXPORT_SCHEMA_VERSION;
  localSchemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
  exportId: string;
  exportedAt: string;
  source: {
    app: "senex";
    origin: string | null;
    includeTrialEvents: boolean;
  };
  metadata: {
    lastSavedAt: string | null;
  };
  data: ExportableLocalRecords & {
    stimulusReferences: StimulusReference[];
  };
}

export function createExportEnvelopeFromRecords(input: {
  exportedAt: string;
  exportId: string;
  origin: string | null;
  includeTrialEvents: boolean;
  records: ExportableLocalRecords;
  lastSavedAt?: string | null;
}): LocalExportEnvelope {
  const envelope: LocalExportEnvelope = {
    format: EXPORT_FORMAT,
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    localSchemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
    exportId: input.exportId,
    exportedAt: input.exportedAt,
    source: {
      app: "senex",
      origin: input.origin,
      includeTrialEvents: input.includeTrialEvents,
    },
    metadata: {
      lastSavedAt: input.lastSavedAt ?? null,
    },
    data: {
      ...input.records,
      trialEvents: input.includeTrialEvents ? input.records.trialEvents : [],
      stimulusReferences: input.records.taskRuns.map(stimulusReferenceForTask),
    },
  };
  assertLocalExportEnvelope(envelope);
  return envelope;
}

export function parseLocalExportJson(text: string): LocalExportEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Import file must contain valid JSON.");
  }
  assertLocalExportEnvelope(parsed);
  return parsed;
}

export function assertLocalExportEnvelope(
  value: unknown,
): asserts value is LocalExportEnvelope {
  const envelope = expectRecord(value, "LocalExportEnvelope");
  if (envelope.format !== EXPORT_FORMAT)
    fail(`LocalExportEnvelope.format must be ${EXPORT_FORMAT}`);
  validateExportSchemaVersion(envelope.exportSchemaVersion);
  validateLocalSchemaVersion(envelope.localSchemaVersion);
  expectNonEmptyString(envelope, "appVersion", "LocalExportEnvelope");
  expectNonEmptyString(envelope, "exportId", "LocalExportEnvelope");
  expectIso(envelope, "exportedAt", "LocalExportEnvelope");
  validateSource(envelope.source);
  validateMetadata(envelope.metadata);
  validateExportData(envelope.data);
}

function validateExportSchemaVersion(value: unknown) {
  if (value === EXPORT_SCHEMA_VERSION) return;
  if (typeof value === "number" && value > EXPORT_SCHEMA_VERSION) {
    fail(`Cannot import future export schema version ${value}`);
  }
  fail(
    `LocalExportEnvelope.exportSchemaVersion must be ${EXPORT_SCHEMA_VERSION}`,
  );
}

function validateLocalSchemaVersion(value: unknown) {
  if (value === LOCAL_SCHEMA_VERSION) return;
  if (typeof value === "number" && value > LOCAL_SCHEMA_VERSION) {
    fail(`Cannot import future local schema version ${value}`);
  }
  fail(
    `LocalExportEnvelope.localSchemaVersion must be ${LOCAL_SCHEMA_VERSION}`,
  );
}

function validateSource(value: unknown) {
  const source = expectRecord(value, "LocalExportEnvelope.source");
  expectEnum(source, "app", ["senex"], "LocalExportEnvelope.source");
  expectStringOrNull(source, "origin", "LocalExportEnvelope.source");
  if (typeof source.includeTrialEvents !== "boolean") {
    fail("LocalExportEnvelope.source.includeTrialEvents must be a boolean");
  }
}

function validateMetadata(value: unknown) {
  const metadata = expectRecord(value, "LocalExportEnvelope.metadata");
  expectStringOrNull(metadata, "lastSavedAt", "LocalExportEnvelope.metadata");
  if (metadata.lastSavedAt !== null)
    expectIso(metadata, "lastSavedAt", "LocalExportEnvelope.metadata");
}

function validateExportData(value: unknown) {
  const data = expectRecord(value, "LocalExportEnvelope.data");
  validateArray(data.profiles, assertLocalProfile, "profiles");
  validateArray(data.sessions, assertLocalSession, "sessions");
  validateArray(data.taskRuns, assertTaskRunRecord, "taskRuns");
  validateArray(data.trialEvents, assertTrialEventRecord, "trialEvents");
  validateArray(data.scores, assertScoreRecord, "scores");
  validateArray(
    data.questionnaireAnswers,
    assertQuestionnaireAnswerRecord,
    "questionnaireAnswers",
  );
  validateArray(data.consentRecords, assertConsentRecord, "consentRecords");
  validateArray(
    data.anonymousIdentities,
    assertAnonymousIdentityRecord,
    "anonymousIdentities",
  );
  validateArray(
    data.reportingUploads,
    assertReportingUploadRecord,
    "reportingUploads",
  );
  validateArray(data.importAudits, assertImportAuditRecord, "importAudits");
  validateArray(
    data.stimulusReferences,
    assertStimulusReference,
    "stimulusReferences",
  );
  assertStimulusReferencesMatchTaskRuns(
    data.taskRuns as TaskRunRecord[],
    data.stimulusReferences as StimulusReference[],
  );
}

function validateArray<T>(
  value: unknown,
  assertItem: (item: unknown) => asserts item is T,
  name: string,
) {
  if (!Array.isArray(value))
    fail(`LocalExportEnvelope.data.${name} must be an array`);
  for (const item of value) assertItem(item);
}

function assertStimulusReference(
  value: unknown,
): asserts value is StimulusReference {
  const record = expectRecord(value, "StimulusReference");
  expectNonEmptyString(record, "taskRunId", "StimulusReference");
  expectNonEmptyString(record, "taskId", "StimulusReference");
  expectNonEmptyString(record, "taskVersion", "StimulusReference");
  expectNonEmptyString(record, "stimulusPackId", "StimulusReference");
  expectNonEmptyString(record, "stimulusSeed", "StimulusReference");
}

function expectRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function assertExportableRecords(records: ExportableLocalRecords) {
  for (const profile of records.profiles) assertLocalProfile(profile);
  for (const session of records.sessions) assertLocalSession(session);
  for (const taskRun of records.taskRuns) assertTaskRunRecord(taskRun);
  for (const trialEvent of records.trialEvents)
    assertTrialEventRecord(trialEvent);
  for (const score of records.scores) assertScoreRecord(score);
  for (const answer of records.questionnaireAnswers)
    assertQuestionnaireAnswerRecord(answer);
  for (const consent of records.consentRecords) assertConsentRecord(consent);
  for (const identity of records.anonymousIdentities)
    assertAnonymousIdentityRecord(identity);
  for (const upload of records.reportingUploads)
    assertReportingUploadRecord(upload);
  for (const audit of records.importAudits) assertImportAuditRecord(audit);
}

export function recordCounts(records: ExportableLocalRecords) {
  return {
    profiles: records.profiles.length,
    sessions: records.sessions.length,
    taskRuns: records.taskRuns.length,
    trialEvents: records.trialEvents.length,
    scores: records.scores.length,
    questionnaireAnswers: records.questionnaireAnswers.length,
    consentRecords: records.consentRecords.length,
    anonymousIdentities: records.anonymousIdentities.length,
    reportingUploads: records.reportingUploads.length,
    importAudits: records.importAudits.length,
  };
}
