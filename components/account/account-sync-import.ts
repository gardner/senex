import { buildAccountSyncPayload } from "@/lib/account-sync/payload";
import type { ExportableLocalRecords } from "@/lib/local/export-schema";
import {
  captureEngineeringTelemetry,
  classifyTelemetryFailure,
} from "@/lib/telemetry";

export async function postSyncPayload(
  accountId: string,
  records: ExportableLocalRecords,
) {
  const payload = buildAccountSyncPayload({ accountId, records });
  const response = await fetch("/api/account/sessions/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as {
    status?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new AccountSyncError(
      typeof body.error === "string" ? body.error : "Account sync failed.",
      response.status,
    );
  }
  return body;
}

export function captureAccountSyncFailure(
  operation: "load" | "submit",
  error: unknown,
  records: ExportableLocalRecords | null,
) {
  void captureEngineeringTelemetry({
    type: "account_sync_failure",
    mode: "signed_in",
    occurredAt: new Date().toISOString(),
    details: {
      operation,
      reason: classifyTelemetryFailure(error),
      responseStatus:
        error instanceof AccountSyncError ? error.responseStatus : undefined,
      recordCategoryCount: records ? countRecordCategories(records) : 0,
    },
  });
}

class AccountSyncError extends Error {
  constructor(
    message: string,
    readonly responseStatus: number,
  ) {
    super(message);
  }
}

function countRecordCategories(records: ExportableLocalRecords) {
  return [
    records.sessions,
    records.taskRuns,
    records.trialEvents,
    records.scores,
    records.consentRecords,
  ].filter((collection) => collection.length > 0).length;
}
