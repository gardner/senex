import { getAllRecords, getMetadataValue, LOCAL_STORES } from "./idb";
import {
  createExportEnvelopeFromRecords,
  type ExportableLocalRecords,
  type LocalExportEnvelope,
} from "./export-schema";
import type {
  AnonymousIdentityRecord,
  ConsentRecord,
  ImportAuditRecord,
  LocalProfile,
  LocalSession,
  QuestionnaireAnswerRecord,
  ReportingUploadRecord,
  ScoreRecord,
  TaskRunRecord,
  TrialEventRecord,
} from "./types";

export async function createLocalExportEnvelope(
  options: { includeTrialEvents?: boolean } = {},
): Promise<LocalExportEnvelope> {
  const includeTrialEvents = options.includeTrialEvents ?? true;
  const [records, lastSavedAt] = await Promise.all([
    readAllLocalRecords(includeTrialEvents),
    getMetadataValue("lastSavedAt"),
  ]);
  return createExportEnvelopeFromRecords({
    exportedAt: new Date().toISOString(),
    exportId: `export_${crypto.randomUUID()}`,
    origin: typeof location === "undefined" ? null : location.origin,
    includeTrialEvents,
    records,
    lastSavedAt: typeof lastSavedAt === "string" ? lastSavedAt : null,
  });
}

export async function readAllLocalRecords(
  includeTrialEvents = true,
): Promise<ExportableLocalRecords> {
  const [
    profiles,
    sessions,
    taskRuns,
    trialEvents,
    scores,
    questionnaireAnswers,
    consentRecords,
    anonymousIdentities,
    reportingUploads,
    importAudits,
  ] = await Promise.all([
    getAllRecords<LocalProfile>(LOCAL_STORES.profiles),
    getAllRecords<LocalSession>(LOCAL_STORES.sessions),
    getAllRecords<TaskRunRecord>(LOCAL_STORES.taskRuns),
    includeTrialEvents
      ? getAllRecords<TrialEventRecord>(LOCAL_STORES.trialEvents)
      : Promise.resolve([]),
    getAllRecords<ScoreRecord>(LOCAL_STORES.scores),
    getAllRecords<QuestionnaireAnswerRecord>(LOCAL_STORES.questionnaireAnswers),
    getAllRecords<ConsentRecord>(LOCAL_STORES.consentRecords),
    getAllRecords<AnonymousIdentityRecord>(LOCAL_STORES.anonymousIdentities),
    getAllRecords<ReportingUploadRecord>(LOCAL_STORES.reportingUploads),
    getAllRecords<ImportAuditRecord>(LOCAL_STORES.importAudits),
  ]);
  return {
    profiles,
    sessions,
    taskRuns,
    trialEvents,
    scores,
    questionnaireAnswers,
    consentRecords,
    anonymousIdentities,
    reportingUploads,
    importAudits,
  };
}

export function localExportFileName(envelope: LocalExportEnvelope) {
  const stamp = envelope.exportedAt.slice(0, 10);
  return `senex-backup-${stamp}.json`;
}
