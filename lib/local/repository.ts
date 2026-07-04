import {
  deleteSenexLocalDatabase,
  getAllRecords,
  getFirstProfile,
  getMetadataValue,
  getRecord,
  LOCAL_STORES,
  putRecord,
  putRecords,
  runLocalMigrations,
  setLocalSchemaVersionForTests,
} from "./idb";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type ConsentRecord,
  type ImportAuditRecord,
  type JsonObject,
  type LocalCadence,
  type LocalProfile,
  type LocalSession,
  type QuestionnaireAnswerRecord,
  type ScoreRecord,
  type TaskRunRecord,
  type TrialEventRecord,
} from "./types";
import {
  assertConsentRecord,
  assertImportAuditRecord,
  assertLocalProfile,
  assertLocalSession,
  assertQuestionnaireAnswerRecord,
  assertScoreRecord,
  assertTaskRunRecord,
  assertTrialEventRecord,
} from "./validators";

export interface LocalStorageSummary {
  hasLocalHistory: boolean;
  localProfileId: string | null;
  lastSavedAt: string | null;
  schemaVersion: number;
  storagePersisted: boolean | null;
}

export interface PersistenceRequestResult {
  supported: boolean;
  persisted: boolean;
  requested: boolean;
}

type SessionInput = {
  cadence?: LocalCadence;
  contextSnapshot?: JsonObject;
  startedAt?: string;
};

type CompleteSessionInput = {
  completedAt?: string;
  qualityFlags?: string[];
  contextSnapshot?: JsonObject;
};

type TaskRunInput = Omit<TaskRunRecord, "schemaVersion" | "appVersion">;
type TrialEventInput = Omit<TrialEventRecord, "schemaVersion" | "appVersion">;
type ScoreInput = Omit<ScoreRecord, "schemaVersion" | "appVersion">;
type QuestionnaireAnswerInput = Omit<
  QuestionnaireAnswerRecord,
  "schemaVersion" | "appVersion"
>;
type ConsentInput = Omit<ConsentRecord, "schemaVersion" | "appVersion">;

export {
  deleteSenexLocalDatabase,
  runLocalMigrations,
  setLocalSchemaVersionForTests,
};

export async function readLocalStorageSummary(): Promise<LocalStorageSummary> {
  await runLocalMigrations();
  const [profile, lastSavedAt, schemaVersion, storagePersisted] =
    await Promise.all([
      getFirstProfile(),
      getMetadataValue("lastSavedAt"),
      getMetadataValue("schemaVersion"),
      readPersistedStatus(),
    ]);
  return {
    hasLocalHistory: Boolean(profile),
    localProfileId: profile?.profileId ?? null,
    lastSavedAt: typeof lastSavedAt === "string" ? lastSavedAt : null,
    schemaVersion:
      typeof schemaVersion === "number" ? schemaVersion : LOCAL_SCHEMA_VERSION,
    storagePersisted,
  };
}

export async function requestPersistentLocalStorage(): Promise<PersistenceRequestResult> {
  if (!navigator.storage?.persist) {
    return { supported: false, persisted: false, requested: false };
  }
  const alreadyPersisted = await navigator.storage.persisted?.();
  if (alreadyPersisted)
    return { supported: true, persisted: true, requested: false };
  return {
    supported: true,
    persisted: await navigator.storage.persist(),
    requested: true,
  };
}

export async function getOrCreateLocalProfile(): Promise<LocalProfile> {
  const existing = await getFirstProfile();
  if (existing) return existing;
  const now = new Date().toISOString();
  const profile: LocalProfile = {
    profileId: `profile_${crypto.randomUUID()}`,
    mode: "offline",
    createdAt: now,
    updatedAt: now,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
  assertLocalProfile(profile);
  await putRecord(LOCAL_STORES.profiles, profile);
  return profile;
}

export async function startLocalSession(
  input: SessionInput = {},
): Promise<LocalSession> {
  const profile = await getOrCreateLocalProfile();
  const session: LocalSession = {
    sessionId: `session_${crypto.randomUUID()}`,
    profileId: profile.profileId,
    startedAt: input.startedAt ?? new Date().toISOString(),
    completedAt: null,
    cadence: input.cadence ?? "ad_hoc",
    contextSnapshot: input.contextSnapshot ?? {},
    qualityFlags: [],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
  assertLocalSession(session);
  await putRecord(LOCAL_STORES.sessions, session);
  return session;
}

export async function completeLocalSession(
  sessionId: string,
  input: CompleteSessionInput = {},
): Promise<LocalSession> {
  const existing = await getLocalSession(sessionId);
  if (!existing)
    throw new Error(`Cannot complete missing local session ${sessionId}`);
  const completed: LocalSession = {
    ...existing,
    completedAt: input.completedAt ?? new Date().toISOString(),
    contextSnapshot: input.contextSnapshot ?? existing.contextSnapshot,
    qualityFlags: input.qualityFlags ?? existing.qualityFlags,
  };
  assertLocalSession(completed);
  await putRecord(LOCAL_STORES.sessions, completed);
  return completed;
}

export async function getLocalSession(
  sessionId: string,
): Promise<LocalSession | null> {
  return getRecord<LocalSession>(LOCAL_STORES.sessions, sessionId);
}

export async function saveLocalSessionForTests(
  input: Omit<LocalSession, "schemaVersion" | "appVersion">,
): Promise<LocalSession> {
  const record = withVersion(input);
  assertLocalSession(record);
  await putRecord(LOCAL_STORES.sessions, record);
  return record;
}

export async function listAllLocalSessionsForTests(): Promise<LocalSession[]> {
  const records = await getAllRecords<LocalSession>(LOCAL_STORES.sessions);
  return records.toSorted((a, b) => a.sessionId.localeCompare(b.sessionId));
}

export async function saveTaskRun(input: TaskRunInput): Promise<TaskRunRecord> {
  const record = withVersion(input);
  assertTaskRunRecord(record);
  await putRecord(LOCAL_STORES.taskRuns, record);
  return record;
}

export async function listTaskRunsForSession(
  sessionId: string,
): Promise<TaskRunRecord[]> {
  const records = await getAllRecords<TaskRunRecord>(LOCAL_STORES.taskRuns);
  return records.filter((record) => record.sessionId === sessionId);
}

export async function saveTrialEvents(
  inputs: TrialEventInput[],
): Promise<TrialEventRecord[]> {
  const records = inputs.map(withVersion);
  for (const record of records) assertTrialEventRecord(record);
  await putRecords(LOCAL_STORES.trialEvents, records);
  return records;
}

export async function listTrialEventsForTaskRun(
  taskRunId: string,
): Promise<TrialEventRecord[]> {
  const records = await getAllRecords<TrialEventRecord>(
    LOCAL_STORES.trialEvents,
  );
  return records
    .filter((record) => record.taskRunId === taskRunId)
    .toSorted((a, b) => a.trialIndex - b.trialIndex);
}

export async function saveScore(input: ScoreInput): Promise<ScoreRecord> {
  const record = withVersion(input);
  assertScoreRecord(record);
  await putRecord(LOCAL_STORES.scores, record);
  return record;
}

export async function listScores(filters: {
  sessionId?: string;
  taskRunId?: string;
  domain?: string;
  metricName?: string;
}): Promise<ScoreRecord[]> {
  const records = await getAllRecords<ScoreRecord>(LOCAL_STORES.scores);
  return records.filter((record) => {
    if (filters.sessionId && record.sessionId !== filters.sessionId)
      return false;
    if (filters.taskRunId && record.taskRunId !== filters.taskRunId)
      return false;
    if (filters.domain && record.domain !== filters.domain) return false;
    if (filters.metricName && record.metricName !== filters.metricName)
      return false;
    return true;
  });
}

export async function saveQuestionnaireAnswer(
  input: QuestionnaireAnswerInput,
): Promise<QuestionnaireAnswerRecord> {
  const record = withVersion(input);
  assertQuestionnaireAnswerRecord(record);
  await putRecord(LOCAL_STORES.questionnaireAnswers, record);
  return record;
}

export async function saveConsentRecord(
  input: ConsentInput,
): Promise<ConsentRecord> {
  const record = withVersion(input);
  assertConsentRecord(record);
  await putRecord(LOCAL_STORES.consentRecords, record);
  return record;
}

export async function listImportAudits(): Promise<ImportAuditRecord[]> {
  const records = await getAllRecords<ImportAuditRecord>(
    LOCAL_STORES.importAudits,
  );
  for (const record of records) assertImportAuditRecord(record);
  return records.toSorted((a, b) => a.importedAt.localeCompare(b.importedAt));
}

async function readPersistedStatus(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null;
  return navigator.storage.persisted();
}

function withVersion<T extends object>(
  record: T,
): T & {
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
} {
  return {
    ...record,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}
