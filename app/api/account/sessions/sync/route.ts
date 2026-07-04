import { env } from "cloudflare:workers";

import {
  buildSyncStatements,
  validateAccountSyncPayload,
  type AccountSyncPayload,
} from "@/lib/account-sync";
import { auth } from "@/lib/auth";

const MAX_SYNC_BYTES = 1_000_000;

export async function POST(request: Request) {
  if (requestTooLarge(request)) {
    return json(
      { status: "rejected", error: "Sync payload is too large." },
      413,
    );
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ status: "rejected", error: "Authentication required." }, 401);
  }

  let payload: AccountSyncPayload;
  try {
    payload = validateAccountSyncPayload(await request.json());
  } catch (error) {
    return json(
      {
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }

  if (payload.accountId && payload.accountId !== session.user.id) {
    return json(
      {
        status: "rejected",
        error: "Payload accountId does not match the signed-in account.",
      },
      403,
    );
  }

  const existing = await readExistingBatch(
    session.user.id,
    payload.idempotencyKey,
  );
  if (existing) {
    return json({
      status: "duplicate",
      idempotencyKey: payload.idempotencyKey,
      syncBatchId: existing.sync_batch_id,
      syncState: await readSyncState(session.user.id, existing.sync_batch_id),
    });
  }

  const receivedAt = new Date().toISOString();
  const syncBatchId = `account_sync_batch_${payload.idempotencyKey}`;
  await env.DB.batch(
    buildSyncStatements(payload, session.user.id, syncBatchId, receivedAt),
  );
  await writeSyncState(session.user.id, syncBatchId, receivedAt);

  return json(
    {
      status: "accepted",
      idempotencyKey: payload.idempotencyKey,
      syncBatchId,
      syncState: await readSyncState(session.user.id, syncBatchId),
    },
    201,
  );
}

function requestTooLarge(request: Request) {
  const contentLength = request.headers.get("content-length");
  return contentLength !== null && Number(contentLength) > MAX_SYNC_BYTES;
}

async function readExistingBatch(userId: string, idempotencyKey: string) {
  return env.DB.prepare(
    `SELECT sync_batch_id
     FROM account_sync_batches
     WHERE user_id = ? AND idempotency_key = ?`,
  )
    .bind(userId, idempotencyKey)
    .first<{ sync_batch_id: string }>();
}

async function writeSyncState(
  userId: string,
  syncBatchId: string,
  syncedAt: string,
) {
  const conflictCount = await countPendingConflicts(userId);
  await env.DB.prepare(
    `INSERT INTO account_sync_state (
       user_id,
       last_sync_batch_id,
       last_synced_at,
       cursor_json,
       pending_conflict_count,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       last_sync_batch_id = excluded.last_sync_batch_id,
       last_synced_at = excluded.last_synced_at,
       cursor_json = excluded.cursor_json,
       pending_conflict_count = excluded.pending_conflict_count,
       updated_at = excluded.updated_at`,
  )
    .bind(
      userId,
      syncBatchId,
      syncedAt,
      JSON.stringify({ lastSyncBatchId: syncBatchId }),
      conflictCount,
      syncedAt,
    )
    .run();
}

async function readSyncState(userId: string, fallbackBatchId: string) {
  const state = await env.DB.prepare(
    `SELECT last_sync_batch_id, last_synced_at, pending_conflict_count
     FROM account_sync_state
     WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{
      last_sync_batch_id: string | null;
      last_synced_at: string | null;
      pending_conflict_count: number;
    }>();

  return {
    lastSyncBatchId: state?.last_sync_batch_id ?? fallbackBatchId,
    lastSyncedAt: state?.last_synced_at ?? null,
    pendingConflictCount: state?.pending_conflict_count ?? 0,
  };
}

async function countPendingConflicts(userId: string) {
  const tables = [
    ["account_sync_sessions", "local_session_id"],
    ["account_sync_task_runs", "local_task_run_id"],
    ["account_sync_trial_events", "local_trial_event_id"],
    ["account_sync_scores", "local_score_id"],
    ["account_sync_consent_events", "local_consent_record_id"],
  ] as const;
  let count = 0;
  for (const [table, localIdColumn] of tables) {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM (
         SELECT "${localIdColumn}"
         FROM "${table}"
         WHERE user_id = ?
         GROUP BY "${localIdColumn}"
         HAVING COUNT(DISTINCT record_hash) > 1
       )`,
    )
      .bind(userId)
      .first<{ count: number }>();
    count += row?.count ?? 0;
  }
  return count;
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}
