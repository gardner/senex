import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type ConsentDecision,
  type ConsentRecord,
} from "@/lib/local/schema";

export const ANONYMOUS_ACCOUNT_LINK_CONSENT_TYPE =
  "anonymous_account_link" as const;
export const ANONYMOUS_ACCOUNT_LINK_TERMS_VERSION =
  "anonymous-account-link-v1" as const;

const LINK_CATEGORIES = [
  "anonymous_reporting_history",
  "account_identity",
] as const;

export function createAnonymousAccountLinkConsentRecord(input: {
  profileId: string;
  accountId: string;
  decision: ConsentDecision;
  decidedAt: string;
  consentRecordId?: string;
  sourceScreen?: string;
}): ConsentRecord {
  return {
    consentRecordId:
      input.consentRecordId ??
      `consent_${input.profileId}_anonymous_account_link_${compactTime(
        input.decidedAt,
      )}_${crypto.randomUUID()}`,
    profileId: input.profileId,
    mode: "anonymous_reporting",
    consentType: ANONYMOUS_ACCOUNT_LINK_CONSENT_TYPE,
    version: ANONYMOUS_ACCOUNT_LINK_TERMS_VERSION,
    decision: input.decision,
    decidedAt: input.decidedAt,
    sourceScreen: input.sourceScreen ?? "account_sync",
    dataCategories: [
      ...LINK_CATEGORIES,
      accountConsentCategory(input.accountId),
    ],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

export function hasGrantedAnonymousAccountLink(input: {
  accountId: string;
  profileId?: string;
  consentRecords: ConsentRecord[];
}) {
  return getAnonymousAccountLinkState(input).granted;
}

export function getAnonymousAccountLinkState(input: {
  accountId: string;
  profileId?: string;
  consentRecords: ConsentRecord[];
}) {
  const events = input.consentRecords
    .filter((record) => isAnonymousAccountLinkRecord(record, input))
    .toSorted(compareConsentRecords);
  const latest = events.at(-1) ?? null;

  return {
    events,
    latest,
    latestDecision: latest?.decision ?? null,
    granted: latest?.decision === "granted",
  };
}

function isAnonymousAccountLinkRecord(
  record: ConsentRecord,
  input: { accountId: string; profileId?: string },
) {
  if (input.profileId && record.profileId !== input.profileId) return false;
  return (
    record.mode === "anonymous_reporting" &&
    record.consentType === ANONYMOUS_ACCOUNT_LINK_CONSENT_TYPE &&
    record.dataCategories.includes(accountConsentCategory(input.accountId))
  );
}

function accountConsentCategory(accountId: string) {
  return `account:${accountId}`;
}

function compareConsentRecords(left: ConsentRecord, right: ConsentRecord) {
  const byTime = left.decidedAt.localeCompare(right.decidedAt);
  if (byTime !== 0) return byTime;
  return left.consentRecordId.localeCompare(right.consentRecordId);
}

function compactTime(value: string) {
  return value.replaceAll(/[^0-9A-Za-z]/g, "");
}
