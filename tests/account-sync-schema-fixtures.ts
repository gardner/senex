import { env } from "cloudflare:test";

type SqlValue = string | number | null;

const now = "2026-07-04T00:00:00.000Z";
const later = "2026-07-04T00:05:00.000Z";
const userId = "user_sync_schema";
const syncBatchId = "batch_one";
const localProfileId = "local_profile_1";
const sourceFields = {
  source_schema_version: 3,
  source_app_version: "0.1.0",
  received_at: later,
};

export const requiredColumns = {
  account_sync_batches: [
    "sync_batch_id",
    "user_id",
    "idempotency_key",
    "source_profile_id",
    "record_counts_json",
    "received_at",
    "status",
  ],
  account_sync_state: [
    "user_id",
    "last_sync_batch_id",
    "last_synced_at",
    "cursor_json",
    "pending_conflict_count",
    "updated_at",
  ],
  account_sync_sessions: [
    "account_session_id",
    "user_id",
    "sync_batch_id",
    "local_profile_id",
    "local_session_id",
    "record_hash",
    "started_at",
    "completed_at",
    "cadence",
    "context_snapshot_json",
    "quality_flags_json",
    "source_schema_version",
    "source_app_version",
    "received_at",
  ],
  account_sync_task_runs: [
    "account_task_run_id",
    "user_id",
    "sync_batch_id",
    "local_task_run_id",
    "local_session_id",
    "record_hash",
    "task_id",
    "task_version",
    "stimulus_pack_id",
    "stimulus_seed",
    "started_at",
    "completed_at",
    "summary_score_json",
    "quality_flags_json",
    "source_schema_version",
    "source_app_version",
    "received_at",
  ],
  account_sync_trial_events: [
    "account_trial_event_id",
    "user_id",
    "sync_batch_id",
    "local_trial_event_id",
    "local_task_run_id",
    "record_hash",
    "trial_index",
    "stimulus_json",
    "expected_response_json",
    "actual_response_json",
    "correct",
    "stimulus_onset_time",
    "response_time",
    "rt_ms",
    "event_flags_json",
    "source_schema_version",
    "source_app_version",
    "received_at",
  ],
  account_sync_scores: [
    "account_score_id",
    "user_id",
    "sync_batch_id",
    "local_score_id",
    "local_session_id",
    "local_task_run_id",
    "record_hash",
    "domain",
    "metric_name",
    "raw_value",
    "normalized_value",
    "confidence",
    "quality_flags_json",
    "source_schema_version",
    "source_app_version",
    "received_at",
  ],
  account_sync_consent_events: [
    "account_consent_event_id",
    "user_id",
    "sync_batch_id",
    "local_consent_record_id",
    "local_profile_id",
    "record_hash",
    "mode",
    "consent_type",
    "version",
    "decision",
    "decided_at",
    "source_screen",
    "data_categories_json",
    "source_schema_version",
    "source_app_version",
    "received_at",
  ],
};

export async function tableColumns(table: string) {
  const result = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{
    name: string;
  }>();
  return result.results.map((column) => column.name);
}

export async function seedAccountSyncBatch() {
  await env.DB.prepare(
    `INSERT INTO "user" (
       "id", "name", "email", "emailVerified", "createdAt", "updatedAt"
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(userId, "Sync User", "sync-schema@example.com", 1, now, now)
    .run();
  await insert("account_sync_batches", {
    sync_batch_id: syncBatchId,
    user_id: userId,
    idempotency_key: "idempotency_one",
    source_profile_id: localProfileId,
    record_counts_json: JSON.stringify({ sessions: 2 }),
    received_at: now,
    status: "accepted",
  });
  await insert("account_sync_state", {
    user_id: userId,
    last_sync_batch_id: syncBatchId,
    last_synced_at: later,
    cursor_json: JSON.stringify({ nextSince: later }),
    pending_conflict_count: 1,
    updated_at: later,
  });
}

export async function insertSession(
  accountSessionId: string,
  recordHash: string,
  startedAt: string,
) {
  await insert("account_sync_sessions", {
    account_session_id: accountSessionId,
    user_id: userId,
    sync_batch_id: syncBatchId,
    local_profile_id: localProfileId,
    local_session_id: "local_session_1",
    record_hash: recordHash,
    started_at: startedAt,
    completed_at: later,
    cadence: "daily",
    context_snapshot_json: JSON.stringify({ sleepQuality: "ok" }),
    quality_flags_json: JSON.stringify([]),
    ...sourceFields,
  });
}

export async function insertRelatedRecords() {
  await insert("account_sync_task_runs", {
    account_task_run_id: "account_task_run_1",
    user_id: userId,
    sync_batch_id: syncBatchId,
    local_task_run_id: "local_task_run_1",
    local_session_id: "local_session_1",
    record_hash: "task_hash",
    task_id: "simple_reaction_time",
    task_version: "1.0.0",
    stimulus_pack_id: "pack_1",
    stimulus_seed: "seed_1",
    started_at: now,
    completed_at: later,
    summary_score_json: JSON.stringify({ medianRtMs: 412 }),
    quality_flags_json: JSON.stringify([]),
    ...sourceFields,
  });
  await insertTrialEvent();
  await insertScore();
  await insertConsentEvent();
}

export async function readSessionRows() {
  const rows = await env.DB.prepare(
    `SELECT local_session_id, record_hash, started_at
       FROM account_sync_sessions
       WHERE user_id = ?
       ORDER BY record_hash`,
  )
    .bind(userId)
    .all<{
      local_session_id: string;
      record_hash: string;
      started_at: string;
    }>();
  return rows.results;
}

export async function readRelatedCounts() {
  return env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM account_sync_task_runs WHERE local_session_id = 'local_session_1') AS task_run_count,
       (SELECT COUNT(*) FROM account_sync_trial_events WHERE local_task_run_id = 'local_task_run_1') AS trial_event_count,
       (SELECT COUNT(*) FROM account_sync_scores WHERE local_score_id = 'local_score_1') AS score_count,
       (SELECT COUNT(*) FROM account_sync_consent_events WHERE local_consent_record_id = 'local_consent_1') AS consent_count,
       (SELECT pending_conflict_count FROM account_sync_state WHERE user_id = 'user_sync_schema') AS pending_conflict_count`,
  ).first<Record<string, number>>();
}

async function insertTrialEvent() {
  await insert("account_sync_trial_events", {
    account_trial_event_id: "account_trial_event_1",
    user_id: userId,
    sync_batch_id: syncBatchId,
    local_trial_event_id: "local_trial_event_1",
    local_task_run_id: "local_task_run_1",
    record_hash: "trial_hash",
    trial_index: 0,
    stimulus_json: JSON.stringify({ shape: "circle" }),
    expected_response_json: JSON.stringify("space"),
    actual_response_json: JSON.stringify("space"),
    correct: 1,
    stimulus_onset_time: 1000,
    response_time: 1412,
    rt_ms: 412,
    event_flags_json: JSON.stringify([]),
    ...sourceFields,
  });
}

async function insertScore() {
  await insert("account_sync_scores", {
    account_score_id: "account_score_1",
    user_id: userId,
    sync_batch_id: syncBatchId,
    local_score_id: "local_score_1",
    local_session_id: "local_session_1",
    local_task_run_id: "local_task_run_1",
    record_hash: "score_hash",
    domain: "reaction_speed",
    metric_name: "median_rt_ms",
    raw_value: 412,
    normalized_value: null,
    confidence: 0.9,
    quality_flags_json: JSON.stringify([]),
    ...sourceFields,
  });
}

async function insertConsentEvent() {
  await insert("account_sync_consent_events", {
    account_consent_event_id: "account_consent_event_1",
    user_id: userId,
    sync_batch_id: syncBatchId,
    local_consent_record_id: "local_consent_1",
    local_profile_id: localProfileId,
    record_hash: "consent_hash",
    mode: "signed_in",
    consent_type: "research_data_sharing",
    version: "2026-07-04",
    decision: "granted",
    decided_at: now,
    source_screen: "account_sync",
    data_categories_json: JSON.stringify(["share_test_summaries"]),
    ...sourceFields,
  });
}

async function insert(table: string, row: Record<string, SqlValue>) {
  const columns = Object.keys(row);
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  await env.DB.prepare(
    `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`,
  )
    .bind(...columns.map((column) => row[column]))
    .run();
}
