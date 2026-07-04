import { getAllRecords, LOCAL_STORES, putRecord } from "./idb";
import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type AnonymousIdentityRecord,
  type ConsentRecord,
  type ReportingUploadRecord,
} from "./types";
import {
  assertAnonymousIdentityRecord,
  assertConsentRecord,
  assertReportingUploadRecord,
} from "./validators";

type ConsentInput = Omit<ConsentRecord, "schemaVersion" | "appVersion">;
type AnonymousIdentityInput = Omit<
  AnonymousIdentityRecord,
  "schemaVersion" | "appVersion"
>;
type ReportingUploadInput = Omit<
  ReportingUploadRecord,
  "schemaVersion" | "appVersion"
>;

export async function saveConsentRecord(
  input: ConsentInput,
): Promise<ConsentRecord> {
  const record = withVersion(input);
  assertConsentRecord(record);
  await putRecord(LOCAL_STORES.consentRecords, record);
  return record;
}

export async function listConsentRecords(filters: {
  profileId?: string;
  mode?: ConsentRecord["mode"];
  consentType?: string;
}): Promise<ConsentRecord[]> {
  const records = await getAllRecords<ConsentRecord>(
    LOCAL_STORES.consentRecords,
  );
  return records
    .filter((record) => consentMatches(record, filters))
    .toSorted((a, b) => a.decidedAt.localeCompare(b.decidedAt));
}

export async function saveAnonymousIdentity(
  input: AnonymousIdentityInput,
): Promise<AnonymousIdentityRecord> {
  const record = withVersion(input);
  assertAnonymousIdentityRecord(record);
  await putRecord(LOCAL_STORES.anonymousIdentities, record);
  return record;
}

export async function listAnonymousIdentities(
  filters: {
    profileId?: string;
    status?: AnonymousIdentityRecord["status"];
  } = {},
): Promise<AnonymousIdentityRecord[]> {
  const records = await getAllRecords<AnonymousIdentityRecord>(
    LOCAL_STORES.anonymousIdentities,
  );
  return records
    .filter((record) => identityMatches(record, filters))
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveReportingUpload(
  input: ReportingUploadInput,
): Promise<ReportingUploadRecord> {
  const record = withVersion(input);
  assertReportingUploadRecord(record);
  await putRecord(LOCAL_STORES.reportingUploads, record);
  return record;
}

export async function listReportingUploads(
  filters: {
    profileId?: string;
    status?: ReportingUploadRecord["status"];
  } = {},
): Promise<ReportingUploadRecord[]> {
  const records = await getAllRecords<ReportingUploadRecord>(
    LOCAL_STORES.reportingUploads,
  );
  return records
    .filter((record) => uploadMatches(record, filters))
    .toSorted((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

function consentMatches(
  record: ConsentRecord,
  filters: {
    profileId?: string;
    mode?: ConsentRecord["mode"];
    consentType?: string;
  },
) {
  if (filters.profileId && record.profileId !== filters.profileId) return false;
  if (filters.mode && record.mode !== filters.mode) return false;
  if (filters.consentType && record.consentType !== filters.consentType)
    return false;
  return true;
}

function identityMatches(
  record: AnonymousIdentityRecord,
  filters: { profileId?: string; status?: AnonymousIdentityRecord["status"] },
) {
  if (filters.profileId && record.profileId !== filters.profileId) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function uploadMatches(
  record: ReportingUploadRecord,
  filters: { profileId?: string; status?: ReportingUploadRecord["status"] },
) {
  if (filters.profileId && record.profileId !== filters.profileId) return false;
  if (filters.status && record.status !== filters.status) return false;
  return true;
}

function withVersion<T extends object>(
  record: T,
): T & {
  schemaVersion: typeof LOCAL_SCHEMA_VERSION;
  appVersion: string;
} {
  return {
    ...record,
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}
