import { env } from "cloudflare:workers";

import { parseJson } from "./json";

export const ACCOUNT_DELETION_SCOPE = {
  accountLinkedData: [
    "user",
    "account_sync_batches",
    "account_sync_state",
    "account_sync_sessions",
    "account_sync_task_runs",
    "account_sync_trial_events",
    "account_sync_scores",
    "account_sync_consent_events",
  ],
  notAutomaticallyDeleted: [
    "anonymous_research_submissions",
    "anonymous_research_submission_records",
    "local_browser_storage",
  ],
};

export const DELETION_LIMITATIONS = [
  "Already shared research submissions are not automatically removed by account deletion; they require review or exclusion handling under the research data policy.",
  "Local browser history is stored on this device and must be deleted from this device.",
  "Operational audit records may be retained where required for security, legal, or research-governance review.",
];

export async function createAccountDeletionRequest(userId: string) {
  const requestedAt = new Date().toISOString();
  const requestId = `account_deletion_request_${crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO account_deletion_requests (
       request_id,
       user_id,
       requested_at,
       status,
       scope_json,
       limitations_json,
       source,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      requestId,
      userId,
      requestedAt,
      "pending",
      JSON.stringify(ACCOUNT_DELETION_SCOPE),
      JSON.stringify(DELETION_LIMITATIONS),
      "account_page",
      requestedAt,
    )
    .run();

  return {
    requestId,
    requestedAt,
    status: "pending",
    scope: ACCOUNT_DELETION_SCOPE,
    limitations: DELETION_LIMITATIONS,
    source: "account_page",
    updatedAt: requestedAt,
  };
}

export async function readOpenDeletionRequest(userId: string) {
  const row = await env.DB.prepare(
    `SELECT request_id, requested_at, status, scope_json, limitations_json, source, updated_at
     FROM account_deletion_requests
     WHERE user_id = ? AND status IN ('pending', 'reviewing')
     ORDER BY requested_at
     LIMIT 1`,
  )
    .bind(userId)
    .first<DeletionRequestRow>();
  return row ? deletionRequestFromRow(row) : null;
}

export async function readDeletionRequests(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT request_id, requested_at, status, scope_json, limitations_json, source, updated_at
     FROM account_deletion_requests
     WHERE user_id = ?
     ORDER BY requested_at, request_id`,
  )
    .bind(userId)
    .all<DeletionRequestRow>();
  return rows.results.map(deletionRequestFromRow);
}

function deletionRequestFromRow(row: DeletionRequestRow) {
  return {
    requestId: row.request_id,
    requestedAt: row.requested_at,
    status: row.status,
    scope: parseJson(row.scope_json),
    limitations: parseJson(row.limitations_json),
    source: row.source,
    updatedAt: row.updated_at,
  };
}

type DeletionRequestRow = {
  request_id: string;
  requested_at: string;
  status: string;
  scope_json: string;
  limitations_json: string;
  source: string;
  updated_at: string;
};
