import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type JsonValue,
  type LocalProfile,
} from "./types";
import {
  captureEngineeringTelemetry,
  classifyTelemetryFailure,
} from "../telemetry";
import {
  queueSchemaVersionThreeMigration,
  queueSchemaVersionTwoMigration,
} from "./migrations";
import { createSchema } from "./schema-upgrade";
import { LOCAL_STORES, type StoreName } from "./stores";

export const LOCAL_DATABASE_NAME = "senex-local";
export const LOCAL_DATABASE_VERSION = 3;

export { LOCAL_STORES };
type MetadataValue = number | string | null;
type MetadataRecord = { key: string; value: MetadataValue };

export async function openSenexLocalDatabase(): Promise<IDBDatabase> {
  const db = await openRawDatabase();
  db.onversionchange = () => db.close();
  try {
    await runLocalMigrationsWithDatabase(db);
    return db;
  } catch (error) {
    db.close();
    captureLocalSchemaMigrationFailure(error);
    throw error;
  }
}

export async function runLocalMigrations(): Promise<void> {
  const db = await openRawDatabase();
  try {
    await runLocalMigrationsWithDatabase(db);
  } catch (error) {
    captureLocalSchemaMigrationFailure(error);
    throw error;
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
    const done = transactionDone(transaction);
    try {
      const result = await callback(transaction);
      await done;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already be finished; preserve the original error.
      }
      await done.catch(() => undefined);
      throw error;
    }
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
  request.onupgradeneeded = (event) => {
    const db = request.result;
    const transaction = request.transaction;
    if (!transaction)
      throw new Error("IndexedDB upgrade transaction is unavailable");
    createSchema(db, transaction);
    if (event.oldVersion > 0 && event.oldVersion < 2) {
      queueSchemaVersionTwoMigration(transaction);
    }
    if (event.oldVersion > 0 && event.oldVersion < 3) {
      queueSchemaVersionThreeMigration(transaction);
    }
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
    void captureEngineeringTelemetry({
      type: "local_schema_migration_success",
      mode: "offline",
      occurredAt: new Date().toISOString(),
      details: {
        operation: "migrate",
        fromSchemaVersion: schemaVersionLabel(current),
        toSchemaVersion: LOCAL_SCHEMA_VERSION,
        localSchemaVersion: LOCAL_SCHEMA_VERSION,
        appVersion: LOCAL_APP_VERSION,
      },
    });
  }
}

function captureLocalSchemaMigrationFailure(error: unknown) {
  void captureEngineeringTelemetry({
    type: "local_schema_migration_failure",
    mode: "offline",
    occurredAt: new Date().toISOString(),
    details: {
      operation: "migrate",
      reason: classifyTelemetryFailure(error),
      toSchemaVersion: LOCAL_SCHEMA_VERSION,
      localSchemaVersion: LOCAL_SCHEMA_VERSION,
      appVersion: LOCAL_APP_VERSION,
    },
  });
}

function schemaVersionLabel(value: MetadataValue) {
  if (typeof value === "number") return value;
  if (value === null) return "missing";
  return "unknown";
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
