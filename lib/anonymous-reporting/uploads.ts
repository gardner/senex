import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type JsonObject,
  type ReportingUploadRecord,
} from "@/lib/local/schema";

import type { AnonymousReportingPayload } from "./types";

export function createReportingUploadRecord(input: {
  profileId: string;
  payload: AnonymousReportingPayload;
  queuedAt: string;
}): ReportingUploadRecord {
  return {
    reportingUploadId: `reporting_upload_${input.payload.idempotencyKey}`,
    profileId: input.profileId,
    anonymousStudyId: input.payload.anonymousStudyId,
    idempotencyKey: input.payload.idempotencyKey,
    status: "queued",
    includedCategories: input.payload.includedCategories,
    consentSnapshot: input.payload.consentSnapshot as unknown as JsonObject,
    payload: input.payload as unknown as JsonObject,
    queuedAt: input.queuedAt,
    submittedAt: null,
    completedAt: null,
    lastError: null,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}
