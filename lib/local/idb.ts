import {
  LOCAL_SCHEMA_VERSION,
  type JsonValue,
  type LocalProfile,
} from "./types";

export const LOCAL_DATABASE_NAME = "senex-local";
export const LOCAL_DATABASE_VERSION = 1;

export const LOCAL_STORES = {
  metadata: "metadata",
  profiles: "profiles",
  sessions: "sessions",
  taskRuns: "taskRuns",
  trialEvents: "trialEvents",
  scores: "scores",
  questionnaireAnswers: "questionnaireAnswers",
  consentRecords: "consentRecords",
  importAudits: "importAudits",
} as const;

type StoreName = (typeof LOCAL_STORES)[keyof typeof LOCAL_STORES];
type MetadataValue = number | string | null;
type MetadataRecord = { key: string; value: MetadataValue };

export async function openSenexLocalDatabase(): Promise<IDBDatabase> {
  const db = await openRawDatabase();
  db.onversionchange = () => db.close();
  await runLocalMigrationsWithDatabase(db);
  return db;
}

export async function runLocalMigrations(): Promise<void> {
  const db = await openRawDatabase();
  try {
    await runLocalMigrationsWithDatabase(db);
  } finally {
    db.close();
  }
}

export async function deleteSenexLocalDatabase(): Promise<void> {
  const request = indexedDB.deleteDatabase(LOCAL_DATABASE_NAME);
  await requestToPromise(request);
}

export async function setLocalSchemaVersionForTests(
  version: number,
): Promise<void> {
  const db = await openRawDatabase();
  try {
    await setMetadataValueWithDatabase(db, "schemaVersion", version);
  } finally {
    db.close();
  }
}

export async function getMetadataValue(key: string): Promise<MetadataValue> {
  const db = await openSenexLocalDatabase();
  try {
    return await getMetadataValueWithDatabase(db, key);
  } finally {
    db.close();
  }
}

export async function setMetadataValue(
  key: string,
  value: MetadataValue,
): Promise<void> {
  const db = await openSenexLocalDatabase();
  try {
    await setMetadataValueWithDatabase(db, key, value);
  } finally {
    db.close();
  }
}

export async function withTransaction<T>(
  storeNames: StoreName[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openSenexLocalDatabase();
  try {
    const transaction = db.transaction(storeNames, mode);
    const result = await callback(transaction);
    await transactionDone(transaction);
    return result;
  } finally {
    db.close();
  }
}

export async function getRecord<T>(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | null> {
  return withTransaction([storeName], "readonly", async (transaction) => {
    const value = await requestToPromise(
      transaction.objectStore(storeName).get(key),
    );
    return (value as T | undefined) ?? null;
  });
}

export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  return withTransaction([storeName], "readonly", async (transaction) => {
    const value = await requestToPromise(
      transaction.objectStore(storeName).getAll(),
    );
    return value as T[];
  });
}

export async function putRecord<T extends JsonValue | object>(
  storeName: StoreName,
  record: T,
): Promise<void> {
  await withTransaction(
    [storeName, LOCAL_STORES.metadata],
    "readwrite",
    async (transaction) => {
      transaction.objectStore(storeName).put(record);
      touchMetadata(transaction);
    },
  );
}

export async function putRecords<T extends JsonValue | object>(
  storeName: StoreName,
  records: T[],
): Promise<void> {
  await withTransaction(
    [storeName, LOCAL_STORES.metadata],
    "readwrite",
    async (transaction) => {
      const store = transaction.objectStore(storeName);
      for (const record of records) store.put(record);
      touchMetadata(transaction);
    },
  );
}

export async function getFirstProfile(): Promise<LocalProfile | null> {
  const profiles = await getAllRecords<LocalProfile>(LOCAL_STORES.profiles);
  return (
    profiles.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ??
    null
  );
}

async function openRawDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(LOCAL_DATABASE_NAME, LOCAL_DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    const transaction = request.transaction;
    if (!transaction)
      throw new Error("IndexedDB upgrade transaction is unavailable");
    createSchema(db, transaction);
    const metadata = request.transaction?.objectStore(LOCAL_STORES.metadata);
    metadata?.put({
      key: "schemaVersion",
      value: LOCAL_SCHEMA_VERSION,
    } satisfies MetadataRecord);
  };
  return requestToPromise(request);
}

async function runLocalMigrationsWithDatabase(db: IDBDatabase): Promise<void> {
  const current = await getMetadataValueWithDatabase(db, "schemaVersion");
  if (typeof current === "number" && current > LOCAL_SCHEMA_VERSION) {
    throw new Error(`Cannot open future local schema version ${current}`);
  }
  if (current !== LOCAL_SCHEMA_VERSION) {
    await setMetadataValueWithDatabase(
      db,
      "schemaVersion",
      LOCAL_SCHEMA_VERSION,
    );
  }
}

async function getMetadataValueWithDatabase(
  db: IDBDatabase,
  key: string,
): Promise<MetadataValue> {
  const transaction = db.transaction(LOCAL_STORES.metadata, "readonly");
  const value = await requestToPromise(
    transaction.objectStore(LOCAL_STORES.metadata).get(key),
  );
  await transactionDone(transaction);
  return (value as MetadataRecord | undefined)?.value ?? null;
}

async function setMetadataValueWithDatabase(
  db: IDBDatabase,
  key: string,
  value: MetadataValue,
): Promise<void> {
  const transaction = db.transaction(LOCAL_STORES.metadata, "readwrite");
  transaction
    .objectStore(LOCAL_STORES.metadata)
    .put({ key, value } satisfies MetadataRecord);
  await transactionDone(transaction);
}

function touchMetadata(transaction: IDBTransaction) {
  transaction.objectStore(LOCAL_STORES.metadata).put({
    key: "lastSavedAt",
    value: new Date().toISOString(),
  } satisfies MetadataRecord);
}

function createSchema(db: IDBDatabase, transaction: IDBTransaction) {
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
  if (!store) return;
  for (const index of indexes) {
    if (!store.indexNames.contains(index)) store.createIndex(index, index);
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}
