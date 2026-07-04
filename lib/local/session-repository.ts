import { getRecord, LOCAL_STORES, putRecord } from "./idb";
import type { JsonObject, LocalSession } from "./types";
import { assertLocalSession } from "./validators";

export async function updateLocalSessionContext(
  sessionId: string,
  input: { contextSnapshot: JsonObject; qualityFlags: string[] },
): Promise<LocalSession> {
  const existing = await getRecord<LocalSession>(
    LOCAL_STORES.sessions,
    sessionId,
  );
  if (!existing)
    throw new Error(`Cannot update missing local session ${sessionId}`);
  const updated: LocalSession = {
    ...existing,
    contextSnapshot: input.contextSnapshot,
    qualityFlags: Array.from(
      new Set([...existing.qualityFlags, ...input.qualityFlags]),
    ),
  };
  assertLocalSession(updated);
  await putRecord(LOCAL_STORES.sessions, updated);
  return updated;
}
