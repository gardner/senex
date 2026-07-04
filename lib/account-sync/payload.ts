import { LOCAL_APP_VERSION, LOCAL_SCHEMA_VERSION } from "@/lib/local/schema";
import type { ExportableLocalRecords } from "@/lib/local/export-schema";

import { stableRecordHash } from "./hash";
import type { AccountSyncPayload } from "./validation";

export function buildAccountSyncPayload(input: {
  accountId: string;
  records: ExportableLocalRecords;
  generatedAt?: string;
}): AccountSyncPayload {
  const sourceProfile = input.records.profiles[0];
  if (!sourceProfile) {
    throw new Error("No local profile is available to sync.");
  }
  if (
    sourceProfile.mode === "anonymous_reporting" ||
    input.records.anonymousIdentities.length > 0
  ) {
    throw new Error(
      "Anonymous reporting history requires explicit account linking before account sync.",
    );
  }

  const records = {
    sessions: input.records.sessions,
    taskRuns: input.records.taskRuns,
    trialEvents: input.records.trialEvents,
    scores: input.records.scores,
    consentEvents: input.records.consentRecords,
  };
  const idempotencySource = {
    accountId: input.accountId,
    sourceProfileId: sourceProfile.profileId,
    records,
  };

  return {
    payloadVersion: "account-sync-v1",
    accountId: input.accountId,
    idempotencyKey: `sync_${stableRecordHash(idempotencySource)}`,
    sourceProfileId: sourceProfile.profileId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    schemaVersions: {
      local: LOCAL_SCHEMA_VERSION,
      app: LOCAL_APP_VERSION,
    },
    records,
  };
}
