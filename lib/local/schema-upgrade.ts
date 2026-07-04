import { LOCAL_STORES } from "./stores";

export function createSchema(db: IDBDatabase, transaction: IDBTransaction) {
  createStore(db, transaction, LOCAL_STORES.metadata, "key");
  createStore(db, transaction, LOCAL_STORES.profiles, "profileId", [
    "mode",
    "updatedAt",
  ]);
  createStore(db, transaction, LOCAL_STORES.sessions, "sessionId", [
    "profileId",
    "startedAt",
  ]);
  createStore(db, transaction, LOCAL_STORES.taskRuns, "taskRunId", [
    "sessionId",
    "taskId",
  ]);
  createStore(db, transaction, LOCAL_STORES.trialEvents, "trialEventId", [
    "taskRunId",
    "trialIndex",
  ]);
  createStore(db, transaction, LOCAL_STORES.scores, "scoreId", [
    "sessionId",
    "taskRunId",
    "domain",
    "metricName",
  ]);
  createStore(db, transaction, LOCAL_STORES.questionnaireAnswers, "answerId", [
    "profileId",
    "sessionId",
  ]);
  createStore(db, transaction, LOCAL_STORES.consentRecords, "consentRecordId", [
    "profileId",
    "consentType",
  ]);
  createStore(
    db,
    transaction,
    LOCAL_STORES.anonymousIdentities,
    "anonymousIdentityId",
    ["profileId", "anonymousStudyId", "status"],
  );
  createStore(
    db,
    transaction,
    LOCAL_STORES.reportingUploads,
    "reportingUploadId",
    ["profileId", "anonymousStudyId", "idempotencyKey", "status"],
  );
  createStore(db, transaction, LOCAL_STORES.importAudits, "importAuditId", [
    "profileId",
    "importedAt",
  ]);
}

function createStore(
  db: IDBDatabase,
  transaction: IDBTransaction,
  name: string,
  keyPath: string,
  indexes: string[] = [],
) {
  const store = db.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : db.createObjectStore(name, { keyPath });
  for (const index of indexes) {
    if (!store.indexNames.contains(index)) store.createIndex(index, index);
  }
}
