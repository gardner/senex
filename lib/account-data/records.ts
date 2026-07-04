import { env } from "cloudflare:workers";
import { parseJson } from "./json";

export async function readSyncState(userId: string) {
  const row = await env.DB.prepare(
    `SELECT last_sync_batch_id, last_synced_at, cursor_json, pending_conflict_count, updated_at
     FROM account_sync_state
     WHERE user_id = ?`,
  )
    .bind(userId)
    .first<SyncStateRow>();
  if (!row) return null;
  return {
    lastSyncBatchId: row.last_sync_batch_id,
    lastSyncedAt: row.last_synced_at,
    cursor: parseJson(row.cursor_json),
    pendingConflictCount: row.pending_conflict_count,
    updatedAt: row.updated_at,
  };
}

export async function readSyncBatches(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT sync_batch_id, idempotency_key, source_profile_id, record_counts_json, received_at, status
     FROM account_sync_batches
     WHERE user_id = ?
     ORDER BY received_at, sync_batch_id`,
  )
    .bind(userId)
    .all<SyncBatchRow>();
  return rows.results.map((row) => ({
    syncBatchId: row.sync_batch_id,
    idempotencyKey: row.idempotency_key,
    sourceProfileId: row.source_profile_id,
    recordCounts: parseJson(row.record_counts_json),
    receivedAt: row.received_at,
    status: row.status,
  }));
}

export async function readAccountRecords(userId: string) {
  const [sessions, taskRuns, trialEvents, scores, consentEvents] =
    await Promise.all([
      readSessions(userId),
      readTaskRuns(userId),
      readTrialEvents(userId),
      readScores(userId),
      readConsentEvents(userId),
    ]);

  return { sessions, taskRuns, trialEvents, scores, consentEvents };
}

async function readSessions(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT account_session_id, sync_batch_id, local_profile_id, local_session_id,
            record_hash, started_at, completed_at, cadence, context_snapshot_json,
            quality_flags_json, source_schema_version, source_app_version, received_at
     FROM account_sync_sessions
     WHERE user_id = ?
     ORDER BY started_at, account_session_id`,
  )
    .bind(userId)
    .all<SessionRow>();
  return rows.results.map((row) => ({
    accountSessionId: row.account_session_id,
    syncBatchId: row.sync_batch_id,
    localProfileId: row.local_profile_id,
    localSessionId: row.local_session_id,
    recordHash: row.record_hash,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cadence: row.cadence,
    contextSnapshot: parseJson(row.context_snapshot_json),
    qualityFlags: parseJson(row.quality_flags_json),
    sourceSchemaVersion: row.source_schema_version,
    sourceAppVersion: row.source_app_version,
    receivedAt: row.received_at,
  }));
}

async function readTaskRuns(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT account_task_run_id, sync_batch_id, local_task_run_id,
            local_session_id, record_hash, task_id, task_version,
            stimulus_pack_id, stimulus_seed, started_at, completed_at,
            summary_score_json, quality_flags_json, source_schema_version,
            source_app_version, received_at
     FROM account_sync_task_runs
     WHERE user_id = ?
     ORDER BY started_at, account_task_run_id`,
  )
    .bind(userId)
    .all<TaskRunRow>();
  return rows.results.map((row) => ({
    accountTaskRunId: row.account_task_run_id,
    syncBatchId: row.sync_batch_id,
    localTaskRunId: row.local_task_run_id,
    localSessionId: row.local_session_id,
    recordHash: row.record_hash,
    taskId: row.task_id,
    taskVersion: row.task_version,
    stimulusPackId: row.stimulus_pack_id,
    stimulusSeed: row.stimulus_seed,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    summaryScore: parseJson(row.summary_score_json),
    qualityFlags: parseJson(row.quality_flags_json),
    sourceSchemaVersion: row.source_schema_version,
    sourceAppVersion: row.source_app_version,
    receivedAt: row.received_at,
  }));
}

async function readTrialEvents(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT account_trial_event_id, sync_batch_id, local_trial_event_id,
            local_task_run_id, record_hash, trial_index, stimulus_json,
            expected_response_json, actual_response_json, correct,
            stimulus_onset_time, response_time, rt_ms, event_flags_json,
            source_schema_version, source_app_version, received_at
     FROM account_sync_trial_events
     WHERE user_id = ?
     ORDER BY local_task_run_id, trial_index, account_trial_event_id`,
  )
    .bind(userId)
    .all<TrialEventRow>();
  return rows.results.map((row) => ({
    accountTrialEventId: row.account_trial_event_id,
    syncBatchId: row.sync_batch_id,
    localTrialEventId: row.local_trial_event_id,
    localTaskRunId: row.local_task_run_id,
    recordHash: row.record_hash,
    trialIndex: row.trial_index,
    stimulus: parseJson(row.stimulus_json),
    expectedResponse: parseJson(row.expected_response_json),
    actualResponse: parseJson(row.actual_response_json),
    correct: row.correct === null ? null : Boolean(row.correct),
    stimulusOnsetTime: row.stimulus_onset_time,
    responseTime: row.response_time,
    rtMs: row.rt_ms,
    eventFlags: parseJson(row.event_flags_json),
    sourceSchemaVersion: row.source_schema_version,
    sourceAppVersion: row.source_app_version,
    receivedAt: row.received_at,
  }));
}

async function readScores(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT account_score_id, sync_batch_id, local_score_id, local_session_id,
            local_task_run_id, record_hash, domain, metric_name, raw_value,
            normalized_value, confidence, quality_flags_json,
            source_schema_version, source_app_version, received_at
     FROM account_sync_scores
     WHERE user_id = ?
     ORDER BY domain, metric_name, account_score_id`,
  )
    .bind(userId)
    .all<ScoreRow>();
  return rows.results.map((row) => ({
    accountScoreId: row.account_score_id,
    syncBatchId: row.sync_batch_id,
    localScoreId: row.local_score_id,
    localSessionId: row.local_session_id,
    localTaskRunId: row.local_task_run_id,
    recordHash: row.record_hash,
    domain: row.domain,
    metricName: row.metric_name,
    rawValue: row.raw_value,
    normalizedValue: row.normalized_value,
    confidence: row.confidence,
    qualityFlags: parseJson(row.quality_flags_json),
    sourceSchemaVersion: row.source_schema_version,
    sourceAppVersion: row.source_app_version,
    receivedAt: row.received_at,
  }));
}

async function readConsentEvents(userId: string) {
  const rows = await env.DB.prepare(
    `SELECT account_consent_event_id, sync_batch_id, local_consent_record_id,
            local_profile_id, record_hash, mode, consent_type, version,
            decision, decided_at, source_screen, data_categories_json,
            source_schema_version, source_app_version, received_at
     FROM account_sync_consent_events
     WHERE user_id = ?
     ORDER BY decided_at, account_consent_event_id`,
  )
    .bind(userId)
    .all<ConsentEventRow>();
  return rows.results.map((row) => ({
    accountConsentEventId: row.account_consent_event_id,
    syncBatchId: row.sync_batch_id,
    localConsentRecordId: row.local_consent_record_id,
    localProfileId: row.local_profile_id,
    recordHash: row.record_hash,
    mode: row.mode,
    consentType: row.consent_type,
    version: row.version,
    decision: row.decision,
    decidedAt: row.decided_at,
    sourceScreen: row.source_screen,
    dataCategories: parseJson(row.data_categories_json),
    sourceSchemaVersion: row.source_schema_version,
    sourceAppVersion: row.source_app_version,
    receivedAt: row.received_at,
  }));
}

type SyncStateRow = {
  last_sync_batch_id: string | null;
  last_synced_at: string | null;
  cursor_json: string;
  pending_conflict_count: number;
  updated_at: string;
};

type SyncBatchRow = {
  sync_batch_id: string;
  idempotency_key: string;
  source_profile_id: string;
  record_counts_json: string;
  received_at: string;
  status: string;
};

type SourceRow = {
  sync_batch_id: string;
  record_hash: string;
  source_schema_version: number;
  source_app_version: string;
  received_at: string;
};

type SessionRow = SourceRow & {
  account_session_id: string;
  local_profile_id: string;
  local_session_id: string;
  started_at: string;
  completed_at: string | null;
  cadence: string;
  context_snapshot_json: string;
  quality_flags_json: string;
};

type TaskRunRow = SourceRow & {
  account_task_run_id: string;
  local_task_run_id: string;
  local_session_id: string;
  task_id: string;
  task_version: string;
  stimulus_pack_id: string;
  stimulus_seed: string;
  started_at: string;
  completed_at: string | null;
  summary_score_json: string;
  quality_flags_json: string;
};

type TrialEventRow = SourceRow & {
  account_trial_event_id: string;
  local_trial_event_id: string;
  local_task_run_id: string;
  trial_index: number;
  stimulus_json: string;
  expected_response_json: string;
  actual_response_json: string;
  correct: number | null;
  stimulus_onset_time: number;
  response_time: number | null;
  rt_ms: number | null;
  event_flags_json: string;
};

type ScoreRow = SourceRow & {
  account_score_id: string;
  local_score_id: string;
  local_session_id: string;
  local_task_run_id: string;
  domain: string;
  metric_name: string;
  raw_value: number;
  normalized_value: number | null;
  confidence: number;
  quality_flags_json: string;
};

type ConsentEventRow = SourceRow & {
  account_consent_event_id: string;
  local_consent_record_id: string;
  local_profile_id: string;
  mode: string;
  consent_type: string;
  version: string;
  decision: string;
  decided_at: string;
  source_screen: string;
  data_categories_json: string;
};
