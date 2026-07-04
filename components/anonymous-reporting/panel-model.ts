import {
  CONSENT_CATEGORIES,
  deriveActiveConsent,
  type AnonymousReportingScope,
} from "@/lib/anonymous-reporting";
import type {
  AnonymousIdentityRecord,
  ConsentRecord,
  ReportingUploadRecord,
} from "@/lib/local";
import {
  listAnonymousIdentities,
  listConsentRecords,
  listReportingUploads,
} from "@/lib/local";

import type { ReportingScopeType } from "./panel-controls";

export type ReportingSnapshot = {
  identities: AnonymousIdentityRecord[];
  consents: ConsentRecord[];
  uploads: ReportingUploadRecord[];
};

export async function readReportingSnapshot(): Promise<ReportingSnapshot> {
  const [identities, consents, uploads] = await Promise.all([
    listAnonymousIdentities(),
    listConsentRecords({ mode: "anonymous_reporting" }),
    listReportingUploads(),
  ]);
  return { identities, consents, uploads };
}

export function selectIdentity(identities: AnonymousIdentityRecord[]) {
  return (
    identities.find((record) => record.status === "active") ??
    identities.find((record) => record.status === "paused") ??
    identities.at(-1) ??
    null
  );
}

export function checkedFromConsent(
  consent: ReturnType<typeof deriveActiveConsent>,
) {
  return Object.fromEntries(
    CONSENT_CATEGORIES.map((category) => [
      category.id,
      consent.decisions[category.id] === "granted",
    ]),
  );
}

export function selectedScope(
  scopeType: ReportingScopeType,
  rangeStart: string,
  rangeEnd: string,
): AnonymousReportingScope {
  if (scopeType === "from_today")
    return { type: "from_today", today: todayString() };
  if (scopeType === "date_range") {
    return {
      type: "date_range",
      from: `${rangeStart || todayString()}T00:00:00.000Z`,
      to: `${rangeEnd || rangeStart || todayString()}T23:59:59.999Z`,
    };
  }
  return { type: "all_existing_history" };
}

export function latestSubmittableUpload(uploads: ReportingUploadRecord[]) {
  return uploads
    .toReversed()
    .find((upload) => upload.status === "queued" || upload.status === "failed");
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function errorMessage(body: unknown) {
  if (typeof body === "object" && body && "error" in body) {
    return String(body.error);
  }
  return "Anonymous reporting upload failed.";
}
