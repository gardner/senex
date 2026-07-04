import { env } from "cloudflare:workers";

type FailureMetadata = {
  idempotencyKeyHash: string | null;
  payloadVersion: string | null;
  localSchemaVersion: string | null;
  appVersion: string | null;
  consentTermsVersion: string | null;
  categories: string[];
};

const ACTION_REQUIRED =
  "Review the validation error and payload schema before requesting a new upload.";

export async function recordAnonymousIngestionFailure(input: {
  payload: unknown;
  error: unknown;
  receivedAt: string;
}) {
  const metadata = metadataFromPayload(input.payload);
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);

  await env.DB.prepare(
    `INSERT INTO anonymous_research_ingestion_failures (
       failure_id,
       idempotency_key_hash,
       payload_version,
       local_schema_version,
       app_version,
       consent_terms_version,
       category_list_json,
       received_at,
       status,
       retry_state,
       error_message,
       action_required
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `anonymous_ingestion_failure_${crypto.randomUUID()}`,
      metadata.idempotencyKeyHash,
      metadata.payloadVersion,
      metadata.localSchemaVersion,
      metadata.appVersion,
      metadata.consentTermsVersion,
      JSON.stringify(metadata.categories),
      input.receivedAt,
      "rejected",
      "needs_review",
      message,
      ACTION_REQUIRED,
    )
    .run();
}

function metadataFromPayload(payload: unknown): FailureMetadata {
  const value = recordOrNull(payload);
  const schemaVersions = recordOrNull(value?.schemaVersions);
  const consentSnapshot = recordOrNull(value?.consentSnapshot);
  const categories = Array.isArray(value?.includedCategories)
    ? value.includedCategories.filter(
        (category) => typeof category === "string",
      )
    : [];

  return {
    idempotencyKeyHash: hashIfString(value?.idempotencyKey),
    payloadVersion: stringOrNull(value?.payloadVersion),
    localSchemaVersion: stringOrNull(schemaVersions?.local),
    appVersion: stringOrNull(schemaVersions?.app),
    consentTermsVersion: stringOrNull(consentSnapshot?.termsVersion),
    categories,
  };
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function stringOrNull(value: unknown) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function hashIfString(value: unknown) {
  return typeof value === "string" && value.length > 0
    ? stableHash(value)
    : null;
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
