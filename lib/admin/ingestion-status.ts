import { env } from "cloudflare:workers";

export type IngestionStatus = Awaited<
  ReturnType<typeof getAnonymousIngestionStatus>
>;

type SummaryRow = { count: number; last_received_at: string | null };
type AcceptedVersionRow = {
  payload_json: string;
};
type FailureRow = {
  received_at: string;
  status: string;
  retry_state: string;
  error_message: string;
  action_required: string;
  payload_version: string | null;
  local_schema_version: string | null;
  app_version: string | null;
  category_list_json: string;
};
type FailureVersionRow = {
  local_schema_version: string | null;
  app_version: string | null;
  failed_count: number;
};
type SubmissionRow = {
  received_at: string;
  status: string;
  payload_json: string;
  category_list_json: string;
  record_count: number;
};

export async function getAnonymousIngestionStatus() {
  const [
    acceptedSummary,
    failedSummary,
    pendingReview,
    duplicates,
    acceptedVersions,
    failureVersions,
    failures,
    recentSubmissions,
  ] = await Promise.all([
    countAcceptedSubmissions(),
    countFailedSubmissions(),
    countPendingReviewFailures(),
    countDuplicateAudits(),
    listAcceptedVersions(),
    listFailureVersions(),
    listRecentFailures(),
    listRecentSubmissions(),
  ]);

  return {
    status: "ok" as const,
    generatedAt: new Date().toISOString(),
    summary: {
      acceptedSubmissions: acceptedSummary.count,
      failedSubmissions: failedSummary.count,
      pendingReview,
      duplicateSubmissions: duplicates,
      lastReceivedAt: latestDate([
        acceptedSummary.last_received_at,
        failedSummary.last_received_at,
      ]),
    },
    schemaVersions: buildSchemaVersions(acceptedVersions, failureVersions),
    failures: failures.map(formatFailure),
    recentSubmissions: recentSubmissions.map(formatSubmission),
  };
}

async function countAcceptedSubmissions(): Promise<SummaryRow> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count, MAX(received_at) AS last_received_at
     FROM anonymous_research_submissions`,
  ).first<SummaryRow>();
  return row ?? { count: 0, last_received_at: null };
}

async function countFailedSubmissions(): Promise<SummaryRow> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count, MAX(received_at) AS last_received_at
     FROM anonymous_research_ingestion_failures`,
  ).first<SummaryRow>();
  return row ?? { count: 0, last_received_at: null };
}

async function countPendingReviewFailures() {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM anonymous_research_ingestion_failures
     WHERE retry_state = 'needs_review'`,
  ).first<{ count: number }>();
  return row?.count ?? 0;
}

async function countDuplicateAudits() {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM anonymous_research_submission_audit
     WHERE event_type = 'duplicate'`,
  ).first<{ count: number }>();
  return row?.count ?? 0;
}

async function listAcceptedVersions() {
  const { results } = await env.DB.prepare(
    `SELECT payload_json
     FROM anonymous_research_submissions`,
  ).all<AcceptedVersionRow>();
  return results;
}

async function listRecentFailures() {
  const { results } = await env.DB.prepare(
    `SELECT received_at,
            status,
            retry_state,
            error_message,
            action_required,
            payload_version,
            local_schema_version,
            app_version,
            category_list_json
     FROM anonymous_research_ingestion_failures
     ORDER BY received_at DESC
     LIMIT 10`,
  ).all<FailureRow>();
  return results;
}

async function listFailureVersions() {
  const { results } = await env.DB.prepare(
    `SELECT local_schema_version,
            app_version,
            COUNT(*) AS failed_count
     FROM anonymous_research_ingestion_failures
     GROUP BY local_schema_version, app_version`,
  ).all<FailureVersionRow>();
  return results;
}

async function listRecentSubmissions() {
  const { results } = await env.DB.prepare(
    `SELECT s.received_at,
            s.status,
            s.payload_json,
            s.category_list_json,
            COUNT(r.record_id) AS record_count
     FROM anonymous_research_submissions s
     LEFT JOIN anonymous_research_submission_records r
       ON r.submission_id = s.submission_id
     GROUP BY s.submission_id
     ORDER BY s.received_at DESC
     LIMIT 10`,
  ).all<SubmissionRow>();
  return results;
}

function buildSchemaVersions(
  acceptedRows: AcceptedVersionRow[],
  failureRows: FailureVersionRow[],
) {
  const versions = new Map<
    string,
    {
      localSchemaVersion: string;
      appVersion: string;
      acceptedSubmissions: number;
      failedSubmissions: number;
    }
  >();

  for (const row of acceptedRows) {
    const version = versionFromPayload(row.payload_json);
    incrementVersion(versions, version, "acceptedSubmissions");
  }
  for (const row of failureRows) {
    incrementVersion(
      versions,
      {
        localSchemaVersion: row.local_schema_version ?? "unknown",
        appVersion: row.app_version ?? "unknown",
      },
      "failedSubmissions",
      row.failed_count,
    );
  }
  return [...versions.values()].sort((left, right) =>
    left.localSchemaVersion.localeCompare(right.localSchemaVersion),
  );
}

function incrementVersion(
  versions: Map<
    string,
    {
      localSchemaVersion: string;
      appVersion: string;
      acceptedSubmissions: number;
      failedSubmissions: number;
    }
  >,
  version: { localSchemaVersion: string; appVersion: string },
  field: "acceptedSubmissions" | "failedSubmissions",
  amount = 1,
) {
  const key = `${version.localSchemaVersion}:${version.appVersion}`;
  const current =
    versions.get(key) ??
    ({
      ...version,
      acceptedSubmissions: 0,
      failedSubmissions: 0,
    } satisfies {
      localSchemaVersion: string;
      appVersion: string;
      acceptedSubmissions: number;
      failedSubmissions: number;
    });
  current[field] += amount;
  versions.set(key, current);
}

function formatFailure(row: FailureRow) {
  return {
    receivedAt: row.received_at,
    status: row.status,
    retryState: row.retry_state,
    payloadVersion: row.payload_version ?? "unknown",
    localSchemaVersion: row.local_schema_version ?? "unknown",
    appVersion: row.app_version ?? "unknown",
    categoryCount: parseCategoryCount(row.category_list_json),
    error: row.error_message,
    actionRequired: row.action_required,
  };
}

function formatSubmission(row: SubmissionRow) {
  const version = versionFromPayload(row.payload_json);
  return {
    receivedAt: row.received_at,
    status: row.status,
    retryState: "not_required" as const,
    payloadVersion: payloadVersionFromJson(row.payload_json),
    ...version,
    categoryCount: parseCategoryCount(row.category_list_json),
    recordCount: row.record_count,
  };
}

function versionFromPayload(payloadJson: string) {
  const payload = parseObject(payloadJson);
  const schemaVersions = parseNestedObject(payload.schemaVersions);
  return {
    localSchemaVersion: stringOrUnknown(schemaVersions.local),
    appVersion: stringOrUnknown(schemaVersions.app),
  };
}

function payloadVersionFromJson(payloadJson: string) {
  return stringOrUnknown(parseObject(payloadJson).payloadVersion);
}

function parseCategoryCount(value: string) {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed.length : 0;
}

function parseObject(value: string) {
  return parseNestedObject(parseJson(value));
}

function parseNestedObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stringOrUnknown(value: unknown) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function latestDate(values: Array<string | null>) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}
