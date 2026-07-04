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

export function queueSchemaVersionThreeMigration(transaction: IDBTransaction) {
  const store = transaction.objectStore(LOCAL_STORES.questionnaireAnswers);
  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    const answer = cursor.value as Record<string, unknown>;
    const value: Record<string, unknown> = {
      ...answer,
      questionnaireVersion:
        typeof answer.questionnaireVersion === "string"
          ? answer.questionnaireVersion
          : "legacy",
      questionVersion:
        typeof answer.questionVersion === "string"
          ? answer.questionVersion
          : "legacy",
      answerStatus: legacyAnswerStatus(answer.answerValue),
      sourceScreen:
        typeof answer.sourceScreen === "string"
          ? answer.sourceScreen
          : "legacy_local",
      schemaVersion: LOCAL_SCHEMA_VERSION,
    };
    cursor.update(value);
    cursor.continue();
  };
}

function legacyAnswerStatus(value: unknown) {
  if (value === "") return "skipped";
  if (value === null) return "skipped";
  if (Array.isArray(value) && value.length === 0) return "skipped";
  if (value === "prefer_not_to_answer" || value === "prefer_not_to_say") {
    return "prefer_not_to_say";
  }
  return "answered";
}
