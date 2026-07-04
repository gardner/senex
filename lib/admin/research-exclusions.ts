import { env } from "cloudflare:workers";

import { keyedHash } from "@/lib/admin/research-export-manifest";

export const RESEARCH_EXCLUSION_LIMITATION_NOTICE =
  "Future research exports skip excluded submissions. Already generated exports, aggregate dashboards, and datasets already shared outside Senex are not changed by this action.";

export type ResearchExclusionAction = "exclude";
export type ResearchExclusionInput = {
  anonymousStudyId: string;
  reason: string;
  action: ResearchExclusionAction;
};
export type ResearchExclusionResult = Awaited<
  ReturnType<typeof applyResearchExclusion>
>;
export type ResearchExclusionEvent = Awaited<
  ReturnType<typeof listResearchExclusionEvents>
>[number];

type AdminUser = { id: string };
type SubmissionRow = {
  submission_id: string;
  idempotency_key: string;
  deletion_request_status: string;
};
type AuditRow = { created_at: string; event_json: string };

export class ResearchExclusionError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function validateResearchExclusionInput(
  value: unknown,
): ResearchExclusionInput {
  const input = record(value, "payload");
  const action = exclusionAction(input.action);
  return {
    action,
    anonymousStudyId: nonEmptyString(
      input.anonymousStudyId,
      "anonymousStudyId",
    ),
    reason: nonEmptyString(input.reason, "reason"),
  };
}

export async function applyResearchExclusion(
  user: AdminUser,
  input: ResearchExclusionInput,
  changedAt: string,
) {
  const submissions = await listStudySubmissions(input.anonymousStudyId);
  if (submissions.length === 0) {
    throw new ResearchExclusionError(
      404,
      "No accepted anonymous research submissions found for that study ID.",
    );
  }

  const nextStatus = "excluded";
  const changed = submissions.filter(
    (submission) => submission.deletion_request_status !== nextStatus,
  );
  if (changed.length > 0) {
    await writeExclusionChanges(user, input, changedAt, nextStatus, changed);
  }

  return {
    status: "ok" as const,
    action: input.action,
    anonymousStudyIdHash: keyedHash("study", input.anonymousStudyId),
    matchedSubmissions: submissions.length,
    changedSubmissions: changed.length,
    nextStatus,
    limitationNotice: RESEARCH_EXCLUSION_LIMITATION_NOTICE,
  };
}

export async function listResearchExclusionEvents() {
  const { results } = await env.DB.prepare(
    `SELECT created_at, event_json
     FROM anonymous_research_submission_audit
     WHERE event_type = 'research_exclusion_changed'
     ORDER BY created_at DESC
     LIMIT 20`,
  ).all<AuditRow>();
  return results.map(formatAuditEvent);
}

async function listStudySubmissions(anonymousStudyId: string) {
  const { results } = await env.DB.prepare(
    `SELECT submission_id, idempotency_key, deletion_request_status
     FROM anonymous_research_submissions
     WHERE status = 'accepted' AND anonymous_study_id = ?
     ORDER BY received_at ASC`,
  )
    .bind(anonymousStudyId)
    .all<SubmissionRow>();
  return results;
}

async function writeExclusionChanges(
  user: AdminUser,
  input: ResearchExclusionInput,
  changedAt: string,
  nextStatus: string,
  submissions: SubmissionRow[],
) {
  const update = env.DB.prepare(
    `UPDATE anonymous_research_submissions
     SET deletion_request_status = ?
     WHERE submission_id = ?`,
  );
  const audit = env.DB.prepare(
    `INSERT INTO anonymous_research_submission_audit (
       audit_id,
       submission_id,
       idempotency_key,
       event_type,
       event_json,
       created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  await env.DB.batch(
    submissions.flatMap((submission) => [
      update.bind(nextStatus, submission.submission_id),
      audit.bind(
        `anonymous_submission_audit_${crypto.randomUUID()}`,
        submission.submission_id,
        submission.idempotency_key,
        "research_exclusion_changed",
        JSON.stringify({
          eventType: "research_exclusion_changed",
          action: input.action,
          previousStatus: submission.deletion_request_status,
          nextStatus,
          reason: input.reason,
          changedByUserId: user.id,
          changedAt,
          anonymousStudyIdHash: keyedHash("study", input.anonymousStudyId),
          submissionKey: keyedHash("submission", submission.submission_id),
          limitationNotice: RESEARCH_EXCLUSION_LIMITATION_NOTICE,
        }),
        changedAt,
      ),
    ]),
  );
}

function formatAuditEvent(row: AuditRow) {
  const event = parseObject(row.event_json);
  return {
    createdAt: row.created_at,
    action: stringOrUnknown(event.action),
    previousStatus: stringOrUnknown(event.previousStatus),
    nextStatus: stringOrUnknown(event.nextStatus),
    reason: stringOrUnknown(event.reason),
    changedByUserId: stringOrUnknown(event.changedByUserId),
    anonymousStudyIdHash: stringOrUnknown(event.anonymousStudyIdHash),
    submissionKey: stringOrUnknown(event.submissionKey),
    limitationNotice: stringOrUnknown(event.limitationNotice),
  };
}

function exclusionAction(value: unknown): ResearchExclusionAction {
  if (value === "exclude") return value;
  throw new Error("action must be exclude");
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function parseObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringOrUnknown(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}
