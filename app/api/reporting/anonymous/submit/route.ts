import { env } from "cloudflare:workers";

import {
  validateAnonymousReportingPayload,
  type AnonymousReportingPayload,
} from "@/lib/anonymous-reporting";

export async function POST(request: Request) {
  let payload;
  try {
    payload = validateAnonymousReportingPayload(await request.json());
  } catch (error) {
    return json(
      {
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }

  const existing = await env.DB.prepare(
    `SELECT submission_id FROM anonymous_research_submissions
     WHERE idempotency_key = ?`,
  )
    .bind(payload.idempotencyKey)
    .first<{ submission_id: string }>();

  if (existing) {
    await writeAudit(
      existing.submission_id,
      payload.idempotencyKey,
      "duplicate",
    );
    return json({
      status: "duplicate",
      idempotencyKey: payload.idempotencyKey,
      submissionId: existing.submission_id,
    });
  }

  const receivedAt = new Date().toISOString();
  const submissionId = `anonymous_submission_${payload.idempotencyKey}`;
  await env.DB.prepare(
    `INSERT INTO anonymous_research_submissions (
       submission_id,
       anonymous_study_id,
       idempotency_key,
       payload_json,
       consent_snapshot_json,
       category_list_json,
       received_at,
       status,
       deletion_request_status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      submissionId,
      payload.anonymousStudyId,
      payload.idempotencyKey,
      JSON.stringify(payload),
      JSON.stringify(payload.consentSnapshot),
      JSON.stringify(payload.includedCategories),
      receivedAt,
      "accepted",
      "none",
    )
    .run();
  await writeNormalizedRecords(submissionId, payload, receivedAt);
  await writeAudit(submissionId, payload.idempotencyKey, "accepted");

  return json(
    {
      status: "accepted",
      idempotencyKey: payload.idempotencyKey,
      submissionId,
    },
    201,
  );
}

async function writeNormalizedRecords(
  submissionId: string,
  payload: AnonymousReportingPayload,
  createdAt: string,
) {
  const records = normalizedRecords(payload);
  for (const [index, record] of records.entries()) {
    await env.DB.prepare(
      `INSERT INTO anonymous_research_submission_records (
         record_id,
         submission_id,
         anonymous_study_id,
         category,
         record_type,
         record_json,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        `${submissionId}_${record.recordType}_${index}`,
        submissionId,
        payload.anonymousStudyId,
        record.category,
        record.recordType,
        JSON.stringify(record.value),
        createdAt,
      )
      .run();
  }
}

function normalizedRecords(payload: AnonymousReportingPayload) {
  return [
    ...recordsFor("share_test_summaries", "sessionSummaries", payload),
    ...recordsFor("share_test_summaries", "taskRunSummaries", payload),
    ...recordsFor("share_test_summaries", "scores", payload),
    ...recordsFor("share_trial_level_data", "trialEvents", payload),
    ...recordsFor("share_session_context", "sessionContext", payload),
    ...recordsFor("share_demographics", "demographics", payload),
    ...recordsFor("share_questionnaires", "questionnaireAnswers", payload),
  ];
}

function recordsFor(
  category: string,
  recordType: keyof AnonymousReportingPayload["data"],
  payload: AnonymousReportingPayload,
) {
  const records = payload.data[recordType];
  if (!Array.isArray(records)) return [];
  return records.map((value) => ({ category, recordType, value }));
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}

async function writeAudit(
  submissionId: string,
  idempotencyKey: string,
  eventType: "accepted" | "duplicate",
) {
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO anonymous_research_submission_audit (
       audit_id,
       submission_id,
       idempotency_key,
       event_type,
       event_json,
       created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `anonymous_submission_audit_${crypto.randomUUID()}`,
      submissionId,
      idempotencyKey,
      eventType,
      JSON.stringify({ eventType }),
      createdAt,
    )
    .run();
}
