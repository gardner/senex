import { getFirstProfile, getMetadataValue, runLocalMigrations } from "./idb";
import { LOCAL_APP_VERSION, LOCAL_SCHEMA_VERSION } from "./types";
import { captureEngineeringTelemetry } from "../telemetry";

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

export async function readLocalStorageSummary(): Promise<LocalStorageSummary> {
  await runLocalMigrations();
  const [profile, lastSavedAt, schemaVersion, storagePersisted] =
    await Promise.all([
      getFirstProfile(),
      getMetadataValue("lastSavedAt"),
      getMetadataValue("schemaVersion"),
      readPersistedStatus(),
    ]);
  const summary = {
    hasLocalHistory: Boolean(profile),
    localProfileId: profile?.profileId ?? null,
    lastSavedAt: typeof lastSavedAt === "string" ? lastSavedAt : null,
    schemaVersion:
      typeof schemaVersion === "number" ? schemaVersion : LOCAL_SCHEMA_VERSION,
    storagePersisted,
  };
  void captureEngineeringTelemetry({
    type: "version_adoption",
    mode: profile?.mode ?? "offline",
    occurredAt: new Date().toISOString(),
    details: {
      localSchemaVersion: summary.schemaVersion,
      appVersion: LOCAL_APP_VERSION,
    },
  });
  return summary;
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

async function readPersistedStatus(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null;
  return navigator.storage.persisted();
}
