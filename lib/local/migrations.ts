import { LOCAL_STORES } from "./stores";
import { LOCAL_SCHEMA_VERSION } from "./types";

const VERSION_TWO_RECORD_STORES = [
  LOCAL_STORES.profiles,
  LOCAL_STORES.sessions,
  LOCAL_STORES.taskRuns,
  LOCAL_STORES.trialEvents,
  LOCAL_STORES.scores,
  LOCAL_STORES.questionnaireAnswers,
  LOCAL_STORES.consentRecords,
  LOCAL_STORES.importAudits,
] as const;

export function queueSchemaVersionTwoMigration(transaction: IDBTransaction) {
  for (const storeName of VERSION_TWO_RECORD_STORES) {
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const value: Record<string, unknown> = {
        ...(cursor.value as Record<string, unknown>),
        schemaVersion: LOCAL_SCHEMA_VERSION,
      };
      if (storeName === LOCAL_STORES.consentRecords) {
        value.sourceScreen ??= "legacy_local";
      }
      cursor.update(value);
      cursor.continue();
    };
  }
}
