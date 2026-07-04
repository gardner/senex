import { CONSENT_CATEGORY_IDS, type AnonymousReportingPayload } from "./types";

const CATEGORY_DATA_FIELDS = {
  share_test_summaries: ["sessionSummaries", "taskRunSummaries", "scores"],
  share_trial_level_data: ["trialEvents"],
  share_session_context: ["sessionContext"],
  share_demographics: ["demographics"],
  share_questionnaires: ["questionnaireAnswers"],
  allow_longitudinal_research_use: [],
  allow_approved_partner_access: [],
} as const;

export function validateAnonymousReportingPayload(
  value: unknown,
): AnonymousReportingPayload {
  const payload = asRecord(
    value,
    "payload",
  ) as unknown as AnonymousReportingPayload;
  requireString(payload.payloadVersion, "payloadVersion");
  if (payload.payloadVersion !== "anonymous-reporting-v1") {
    throw new Error("payloadVersion must be anonymous-reporting-v1");
  }
  requireString(payload.anonymousStudyId, "anonymousStudyId");
  requireString(payload.idempotencyKey, "idempotencyKey");
  asRecord(payload.consentSnapshot, "consentSnapshot");
  asRecord(payload.consentSnapshot.decisions, "consentSnapshot.decisions");
  asRecord(payload.data, "data");
  if (!Array.isArray(payload.includedCategories)) {
    throw new Error("includedCategories must be an array");
  }
  rejectUnknownCategories(payload.includedCategories);

  const violations = unconsentedPayloadCategories(payload);
  if (violations.length > 0) {
    throw new Error(
      `Payload includes categories without consent: ${violations.join(", ")}`,
    );
  }
  return payload;
}

function rejectUnknownCategories(categories: unknown[]) {
  const allowed = CONSENT_CATEGORY_IDS as readonly string[];
  for (const category of categories) {
    if (typeof category !== "string" || !allowed.includes(category)) {
      throw new Error(`Unknown consent category: ${String(category)}`);
    }
  }
}

export function unconsentedPayloadCategories(
  payload: AnonymousReportingPayload,
) {
  const categories = categoriesPresentInPayload(payload);
  return categories.filter(
    (category) => payload.consentSnapshot.decisions[category] !== "granted",
  );
}

function categoriesPresentInPayload(payload: AnonymousReportingPayload) {
  const present = new Set<string>();
  for (const category of payload.includedCategories) present.add(category);
  for (const category of CONSENT_CATEGORY_IDS) {
    for (const field of CATEGORY_DATA_FIELDS[category]) {
      const value = payload.data[field];
      if (Array.isArray(value) && value.length > 0) present.add(category);
    }
  }
  return CONSENT_CATEGORY_IDS.filter((category) => present.has(category));
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, name: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}
