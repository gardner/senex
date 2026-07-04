import { env } from "cloudflare:workers";

import { stableRecordHash } from "./hash";
import type { AccountSyncPayload } from "./validation";

export function buildSyncStatements(
  payload: AccountSyncPayload,
  userId: string,
  syncBatchId: string,
  receivedAt: string,
) {
  return [
    env.DB.prepare(
      `INSERT INTO account_sync_batches (
         sync_batch_id,
         user_id,
         idempotency_key,
         source_profile_id,
         record_counts_json,
         received_at,
         status
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      syncBatchId,
      userId,
      payload.idempotencyKey,
      payload.sourceProfileId,
      JSON.stringify(recordCounts(payload)),
      receivedAt,
      "accepted",
    ),
    ...payload.records.sessions.map((record) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO account_sync_sessions (
           account_session_id,
           user_id,
           sync_batch_id,
           local_profile_id,
           local_session_id,
           record_hash,
           started_at,
           completed_at,
           cadence,
           context_snapshot_json,
           quality_flags_json,
           source_schema_version,
           source_app_version,
           received_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        serverRecordId("account_session", record.sessionId, record),
        userId,
        syncBatchId,
        record.profileId,
        record.sessionId,
        stableRecordHash(record),
        record.startedAt,
        record.completedAt,
        record.cadence,
        JSON.stringify(record.contextSnapshot),
        JSON.stringify(record.qualityFlags),
        record.schemaVersion,
        record.appVersion,
        receivedAt,
      ),
    ),
    ...payload.records.taskRuns.map((record) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO account_sync_task_runs (
           account_task_run_id,
           user_id,
           sync_batch_id,
           local_task_run_id,
           local_session_id,
           record_hash,
           task_id,
           task_version,
           stimulus_pack_id,
           stimulus_seed,
           started_at,
           completed_at,
           summary_score_json,
           quality_flags_json,
           source_schema_version,
           source_app_version,
           received_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        serverRecordId("account_task_run", record.taskRunId, record),
        userId,
        syncBatchId,
        record.taskRunId,
        record.sessionId,
        stableRecordHash(record),
        record.taskId,
        record.taskVersion,
        record.stimulusPackId,
        record.stimulusSeed,
        record.startedAt,
        record.completedAt,
        JSON.stringify(record.summaryScore),
        JSON.stringify(record.qualityFlags),
        record.schemaVersion,
        record.appVersion,
        receivedAt,
      ),
    ),
    ...payload.records.trialEvents.map((record) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO account_sync_trial_events (
           account_trial_event_id,
           user_id,
           sync_batch_id,
           local_trial_event_id,
           local_task_run_id,
           record_hash,
           trial_index,
           stimulus_json,
           expected_response_json,
           actual_response_json,
           correct,
           stimulus_onset_time,
           response_time,
           rt_ms,
           event_flags_json,
           source_schema_version,
           source_app_version,
           received_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        serverRecordId("account_trial_event", record.trialEventId, record),
        userId,
        syncBatchId,
        record.trialEventId,
        record.taskRunId,
        stableRecordHash(record),
        record.trialIndex,
        JSON.stringify(record.stimulus),
        JSON.stringify(record.expectedResponse),
        JSON.stringify(record.actualResponse),
        record.correct === null ? null : Number(record.correct),
        record.stimulusOnsetTime,
        record.responseTime,
        record.rtMs,
        JSON.stringify(record.eventFlags),
        record.schemaVersion,
        record.appVersion,
        receivedAt,
      ),
    ),
    ...payload.records.scores.map((record) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO account_sync_scores (
           account_score_id,
           user_id,
           sync_batch_id,
           local_score_id,
           local_session_id,
           local_task_run_id,
           record_hash,
           domain,
           metric_name,
           raw_value,
           normalized_value,
           confidence,
           quality_flags_json,
           source_schema_version,
           source_app_version,
           received_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        serverRecordId("account_score", record.scoreId, record),
        userId,
        syncBatchId,
        record.scoreId,
        record.sessionId,
        record.taskRunId,
        stableRecordHash(record),
        record.domain,
        record.metricName,
        record.rawValue,
        record.normalizedValue,
        record.confidence,
        JSON.stringify(record.qualityFlags),
        record.schemaVersion,
        record.appVersion,
        receivedAt,
      ),
    ),
    ...payload.records.consentEvents.map((record) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO account_sync_consent_events (
           account_consent_event_id,
           user_id,
           sync_batch_id,
           local_consent_record_id,
           local_profile_id,
           record_hash,
           mode,
           consent_type,
           version,
           decision,
           decided_at,
           source_screen,
           data_categories_json,
           source_schema_version,
           source_app_version,
           received_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        serverRecordId("account_consent_event", record.consentRecordId, record),
        userId,
        syncBatchId,
        record.consentRecordId,
        record.profileId,
        stableRecordHash(record),
        record.mode,
        record.consentType,
        record.version,
        record.decision,
        record.decidedAt,
        record.sourceScreen,
        JSON.stringify(record.dataCategories),
        record.schemaVersion,
        record.appVersion,
        receivedAt,
      ),
    ),
  ];
}

function recordCounts(payload: AccountSyncPayload) {
  return {
    sessions: payload.records.sessions.length,
    taskRuns: payload.records.taskRuns.length,
    trialEvents: payload.records.trialEvents.length,
    scores: payload.records.scores.length,
    consentEvents: payload.records.consentEvents.length,
  };
}

function serverRecordId(prefix: string, localId: string, record: unknown) {
  return `${prefix}_${localId}_${stableRecordHash(record)}`;
}
