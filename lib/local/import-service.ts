import { LOCAL_STORES, withTransaction } from "./idb";
import {
  assertExportableRecords,
  assertLocalExportEnvelope,
  parseLocalExportJson,
  recordCounts,
  type ExportableLocalRecords,
  type LocalExportEnvelope,
} from "./export-schema";
import { readAllLocalRecords } from "./export-service";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type ImportAuditRecord,
  type JsonObject,
  type LocalSession,
} from "./types";
import { assertImportAuditRecord } from "./validators";

export type LocalImportMode = "merge" | "replace";

const LOCAL_DATA_STORES = [
  LOCAL_STORES.profiles,
  LOCAL_STORES.sessions,
  LOCAL_STORES.taskRuns,
  LOCAL_STORES.trialEvents,
  LOCAL_STORES.scores,
  LOCAL_STORES.questionnaireAnswers,
  LOCAL_STORES.consentRecords,
  LOCAL_STORES.anonymousIdentities,
  LOCAL_STORES.reportingUploads,
  LOCAL_STORES.importAudits,
] as const;

export interface LocalImportPreview {
  envelope: LocalExportEnvelope;
  exportId: string;
  exportedAt: string;
  exportSchemaVersion: number;
  appVersion: string;
  counts: ReturnType<typeof recordCounts>;
  categories: string[];
  dateRange: { from: string | null; to: string | null };
  localImpact: {
    currentSessions: number;
    incomingSessions: number;
    duplicateSessions: number;
  };
}

export async function previewLocalImportText(
  text: string,
): Promise<LocalImportPreview> {
  const envelope = parseLocalExportJson(text);
  const current = await readAllLocalRecords(false);
  return buildLocalImportPreview(envelope, current);
}

export function buildLocalImportPreview(
  envelope: LocalExportEnvelope,
  current: ExportableLocalRecords,
): LocalImportPreview {
  assertLocalExportEnvelope(envelope);
  const counts = recordCounts(recordsFromEnvelope(envelope));
  const duplicateSessions = countDuplicateSessions(
    envelope.data.sessions,
    current.sessions,
  );
  return {
    envelope,
    exportId: envelope.exportId,
    exportedAt: envelope.exportedAt,
    exportSchemaVersion: envelope.exportSchemaVersion,
    appVersion: envelope.appVersion,
    counts,
    categories: categoryNames(counts),
    dateRange: sessionDateRange(envelope.data.sessions),
    localImpact: {
      currentSessions: current.sessions.length,
      incomingSessions: envelope.data.sessions.length,
      duplicateSessions,
    },
  };
}

export async function restoreLocalExportEnvelope(
  envelope: LocalExportEnvelope,
  options: {
    mode: LocalImportMode;
    simulateFailureForTests?: boolean;
  },
): Promise<ImportAuditRecord> {
  assertLocalExportEnvelope(envelope);
  const records = recordsFromEnvelope(envelope);
  assertExportableRecords(records);
  const audit = createImportAudit(envelope, options.mode);
  await writeImportTransaction(records, audit, options);
  return audit;
}

function recordsFromEnvelope(
  envelope: LocalExportEnvelope,
): ExportableLocalRecords {
  return {
    profiles: envelope.data.profiles,
    sessions: envelope.data.sessions,
    taskRuns: envelope.data.taskRuns,
    trialEvents: envelope.data.trialEvents,
    scores: envelope.data.scores,
    questionnaireAnswers: envelope.data.questionnaireAnswers,
    consentRecords: envelope.data.consentRecords,
    anonymousIdentities: envelope.data.anonymousIdentities,
    reportingUploads: envelope.data.reportingUploads,
    importAudits: envelope.data.importAudits,
  };
}

async function writeImportTransaction(
  records: ExportableLocalRecords,
  audit: ImportAuditRecord,
  options: { mode: LocalImportMode; simulateFailureForTests?: boolean },
) {
  await withTransaction(
    [...LOCAL_DATA_STORES, LOCAL_STORES.metadata],
    "readwrite",
    async (transaction) => {
      if (options.mode === "replace") {
        for (const storeName of LOCAL_DATA_STORES) {
          transaction.objectStore(storeName).clear();
        }
      }
      let writeCount = 0;
      writeCount += queueRecords(
        transaction,
        LOCAL_STORES.profiles,
        records.profiles,
      );
      if (options.simulateFailureForTests && writeCount > 0) {
        throw new Error("Simulated import failure");
      }
      queueRecords(transaction, LOCAL_STORES.sessions, records.sessions);
      queueRecords(transaction, LOCAL_STORES.taskRuns, records.taskRuns);
      queueRecords(transaction, LOCAL_STORES.trialEvents, records.trialEvents);
      queueRecords(transaction, LOCAL_STORES.scores, records.scores);
      queueRecords(
        transaction,
        LOCAL_STORES.questionnaireAnswers,
        records.questionnaireAnswers,
      );
      queueRecords(
        transaction,
        LOCAL_STORES.consentRecords,
        records.consentRecords,
      );
      queueRecords(
        transaction,
        LOCAL_STORES.anonymousIdentities,
        records.anonymousIdentities,
      );
      queueRecords(
        transaction,
        LOCAL_STORES.reportingUploads,
        records.reportingUploads,
      );
      queueRecords(
        transaction,
        LOCAL_STORES.importAudits,
        records.importAudits,
      );
      transaction.objectStore(LOCAL_STORES.importAudits).put(audit);
      transaction.objectStore(LOCAL_STORES.metadata).put({
        key: "lastSavedAt",
        value: new Date().toISOString(),
      });
    },
  );
}

function queueRecords(
  transaction: IDBTransaction,
  storeName: string,
  records: object[],
) {
  const store = transaction.objectStore(storeName);
  for (const record of records) store.put(record);
  return records.length;
}

function createImportAudit(
  envelope: LocalExportEnvelope,
  mode: LocalImportMode,
): ImportAuditRecord {
  const audit: ImportAuditRecord = {
    importAuditId: `import_${crypto.randomUUID()}`,
    profileId: envelope.data.profiles[0]?.profileId ?? "profile_unavailable",
    importedAt: new Date().toISOString(),
    sourceSchemaVersion: envelope.exportSchemaVersion,
    sourceAppVersion: envelope.appVersion,
    importMode: mode,
    recordCounts: recordCounts(recordsFromEnvelope(envelope)) as JsonObject,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
  assertImportAuditRecord(audit);
  return audit;
}

function countDuplicateSessions(
  incoming: LocalSession[],
  current: LocalSession[],
) {
  const currentIds = new Set(current.map((session) => session.sessionId));
  return incoming.filter((session) => currentIds.has(session.sessionId)).length;
}

function categoryNames(counts: ReturnType<typeof recordCounts>) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([category]) => category);
}

function sessionDateRange(sessions: LocalSession[]) {
  if (sessions.length === 0) return { from: null, to: null };
  const dates = sessions
    .flatMap((session) => [session.startedAt, session.completedAt])
    .filter((date): date is string => Boolean(date))
    .toSorted();
  return { from: dates[0] ?? null, to: dates.at(-1) ?? null };
}
