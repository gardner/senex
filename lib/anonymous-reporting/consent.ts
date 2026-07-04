import {
  LOCAL_APP_VERSION,
  LOCAL_SCHEMA_VERSION,
  type ConsentDecision,
  type ConsentRecord,
} from "@/lib/local/schema";

import {
  CONSENT_CATEGORY_IDS,
  type ActiveConsentState,
  type ConsentCategoryDefinition,
  type ConsentCategoryId,
} from "./types";

export const CONSENT_TERMS_VERSION = "anonymous-reporting-v1";

export const CONSENT_CATEGORIES: ConsentCategoryDefinition[] = [
  {
    id: "share_test_summaries",
    label: "Share test summaries",
    payloadLabel: "test summaries",
    description: "Session, task, and score summaries without raw trials.",
  },
  {
    id: "share_trial_level_data",
    label: "Share trial-level data",
    payloadLabel: "trial-level data",
    description: "Individual trial responses and response timing.",
  },
  {
    id: "share_session_context",
    label: "Share session context",
    payloadLabel: "session context",
    description: "Optional context such as sleep, stress, and notes.",
  },
  {
    id: "share_demographics",
    label: "Share demographics",
    payloadLabel: "demographics",
    description: "Demographic questionnaire answers when collected.",
  },
  {
    id: "share_questionnaires",
    label: "Share questionnaires",
    payloadLabel: "questionnaires",
    description: "Non-demographic questionnaire answers.",
  },
  {
    id: "allow_longitudinal_research_use",
    label: "Allow longitudinal research use",
    payloadLabel: "longitudinal research use",
    description: "Let approved analyses connect uploads over time.",
  },
  {
    id: "allow_approved_partner_access",
    label: "Allow approved partner access",
    payloadLabel: "approved partner access",
    description: "Permit approved research partners to access consented data.",
  },
];

export function createAnonymousConsentRecord(input: {
  profileId: string;
  category: ConsentCategoryId;
  decision: ConsentDecision;
  decidedAt: string;
  sourceScreen: string;
  consentRecordId?: string;
}): ConsentRecord {
  return {
    consentRecordId:
      input.consentRecordId ??
      `consent_${input.profileId}_${input.category}_${compactTime(
        input.decidedAt,
      )}_${crypto.randomUUID()}`,
    profileId: input.profileId,
    mode: "anonymous_reporting",
    consentType: input.category,
    version: CONSENT_TERMS_VERSION,
    decision: input.decision,
    decidedAt: input.decidedAt,
    sourceScreen: input.sourceScreen,
    dataCategories: [input.category],
    schemaVersion: LOCAL_SCHEMA_VERSION,
    appVersion: LOCAL_APP_VERSION,
  };
}

export function deriveActiveConsent(
  records: ConsentRecord[],
): ActiveConsentState {
  const decisions = emptyDecisions();
  const latestRecordIds: Partial<Record<ConsentCategoryId, string>> = {};
  const history = records
    .filter(isAnonymousReportingCategoryRecord)
    .toSorted(compareConsentRecords);

  for (const record of history) {
    const category = record.consentType as ConsentCategoryId;
    decisions[category] = record.decision;
    latestRecordIds[category] = record.consentRecordId;
  }

  return {
    termsVersion: CONSENT_TERMS_VERSION,
    decisions,
    grantedCategories: CONSENT_CATEGORY_IDS.filter(
      (category) => decisions[category] === "granted",
    ),
    latestRecordIds,
    history,
  };
}

export function categoryLabel(category: ConsentCategoryId) {
  return (
    CONSENT_CATEGORIES.find((definition) => definition.id === category)
      ?.payloadLabel ?? category
  );
}

function emptyDecisions() {
  return Object.fromEntries(
    CONSENT_CATEGORY_IDS.map((category) => [category, "missing"]),
  ) as ActiveConsentState["decisions"];
}

function isAnonymousReportingCategoryRecord(record: ConsentRecord) {
  return (
    record.mode === "anonymous_reporting" &&
    isConsentCategoryId(record.consentType)
  );
}

export function isConsentCategoryId(value: string): value is ConsentCategoryId {
  return (CONSENT_CATEGORY_IDS as readonly string[]).includes(value);
}

function compareConsentRecords(left: ConsentRecord, right: ConsentRecord) {
  const byTime = left.decidedAt.localeCompare(right.decidedAt);
  if (byTime !== 0) return byTime;
  return left.consentRecordId.localeCompare(right.consentRecordId);
}

function compactTime(value: string) {
  return value.replaceAll(/[^0-9A-Za-z]/g, "");
}
