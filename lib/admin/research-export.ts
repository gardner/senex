import { env } from "cloudflare:workers";

import {
  validateAnonymousReportingPayload,
  type AnonymousReportingPayload,
} from "@/lib/anonymous-reporting";
import {
  addResearchExportManifestCounts,
  buildResearchExportManifest,
  emptyResearchExportState,
  keyedHash,
  manifestFromJson,
} from "@/lib/admin/research-export-manifest";
import {
  type ExportableResearchCategory,
  type ResearchExportInput,
  type ResearchExportManifest,
} from "@/lib/admin/research-export-types";

export type ResearchExportBody = Awaited<
  ReturnType<typeof createResearchExport>
>;
export type ResearchExportSummary = Awaited<
  ReturnType<typeof listResearchExports>
>[number];

type AdminUser = { id: string };
type SubmissionRow = {
  submission_id: string;
  anonymous_study_id: string;
  payload_json: string;
  received_at: string;
  deletion_request_status: string;
};
type RecordRow = {
  category: ExportableResearchCategory;
  record_type: string;
  record_json: string;
};
type ExportRow = {
  export_id: string;
  created_at: string;
  status: "completed";
  purpose: string;
  approval_reference: string;
  submission_count: number;
  record_count: number;
  excluded_count: number;
  manifest_json: string;
};

export async function createResearchExport(
  user: AdminUser,
  input: ResearchExportInput,
  createdAt: string,
) {
  const exportId = `research_export_${crypto.randomUUID()}`;
  const rows = await listCandidateSubmissions(input);
  const state = emptyResearchExportState();

  for (const row of rows) {
    const payload = validateAnonymousReportingPayload(
      parseJson(row.payload_json, "stored anonymous reporting payload"),
    );
    if (row.deletion_request_status !== "none") {
      state.excludedForWithdrawal += 1;
      continue;
    }

    const categories = eligibleCategories(input.dataCategories, payload);
    if (categories.length === 0) {
      state.excludedForConsent += 1;
      continue;
    }

    const records = await listSubmissionRecords(row.submission_id, categories);
    if (records.length === 0) {
      state.excludedForConsent += 1;
      continue;
    }

    addResearchExportManifestCounts(state, payload, records);
    state.submissions.push({
      subjectKey: keyedHash("subject", row.anonymous_study_id),
      submissionKey: keyedHash("submission", row.submission_id),
      receivedAt: row.received_at,
      categories,
      records,
    });
  }

  const manifest = buildResearchExportManifest(
    exportId,
    createdAt,
    input,
    rows.length,
    state,
  );
  await storeResearchExport(user, input, manifest);

  return {
    exportVersion: "research-export-v1" as const,
    status: "completed" as const,
    manifest,
    dataset: {
      generatedAt: createdAt,
      submissions: state.submissions,
    },
  };
}

export async function listResearchExports() {
  const { results } = await env.DB.prepare(
    `SELECT export_id,
            created_at,
            status,
            purpose,
            approval_reference,
            submission_count,
            record_count,
            excluded_count,
            manifest_json
     FROM research_exports
     ORDER BY created_at DESC
     LIMIT 20`,
  ).all<ExportRow>();
  return results.map(exportSummary);
}

export async function getResearchExportManifest(exportId: string) {
  const row = await env.DB.prepare(
    `SELECT manifest_json
     FROM research_exports
     WHERE export_id = ?`,
  )
    .bind(exportId)
    .first<{ manifest_json: string }>();
  return row ? manifestFromJson(row.manifest_json) : null;
}

async function listCandidateSubmissions(input: ResearchExportInput) {
  const conditions = ["status = 'accepted'"];
  const bindings: string[] = [];
  if (input.dateFrom) {
    conditions.push("received_at >= ?");
    bindings.push(input.dateFrom);
  }
  if (input.dateTo) {
    conditions.push("received_at <= ?");
    bindings.push(input.dateTo);
  }
  if (input.anonymousStudyId) {
    conditions.push("anonymous_study_id = ?");
    bindings.push(input.anonymousStudyId);
  }
  const { results } = await env.DB.prepare(
    `SELECT submission_id,
            anonymous_study_id,
            payload_json,
            received_at,
            deletion_request_status
     FROM anonymous_research_submissions
     WHERE ${conditions.join(" AND ")}
     ORDER BY received_at ASC`,
  )
    .bind(...bindings)
    .all<SubmissionRow>();
  return results;
}

async function listSubmissionRecords(
  submissionId: string,
  categories: ExportableResearchCategory[],
) {
  const placeholders = categories.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(
    `SELECT category, record_type, record_json
     FROM anonymous_research_submission_records
     WHERE submission_id = ? AND category IN (${placeholders})
     ORDER BY category, record_type, record_id`,
  )
    .bind(submissionId, ...categories)
    .all<RecordRow>();
  return results.map((row) => ({
    category: row.category,
    recordType: row.record_type,
    record: parseJson(row.record_json, "stored anonymous research record"),
  }));
}

function eligibleCategories(
  requested: ExportableResearchCategory[],
  payload: AnonymousReportingPayload,
) {
  return requested.filter(
    (category) =>
      payload.includedCategories.includes(category) &&
      payload.consentSnapshot.decisions[category] === "granted",
  );
}

async function storeResearchExport(
  user: AdminUser,
  input: ResearchExportInput,
  manifest: ResearchExportManifest,
) {
  await env.DB.prepare(
    `INSERT INTO research_exports (
       export_id,
       created_at,
       created_by_user_id,
       status,
       purpose,
       approval_reference,
       filters_json,
       category_list_json,
       submission_count,
       record_count,
       excluded_count,
       manifest_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      manifest.exportId,
      manifest.createdAt,
      user.id,
      "completed",
      input.purpose,
      input.approvalReference,
      JSON.stringify(manifest.filters),
      JSON.stringify(input.dataCategories),
      manifest.counts.submissionsExported,
      manifest.counts.recordsExported,
      manifest.counts.excludedForConsent +
        manifest.counts.excludedForWithdrawal,
      JSON.stringify(manifest),
    )
    .run();
}

function exportSummary(row: ExportRow) {
  return {
    exportId: row.export_id,
    createdAt: row.created_at,
    status: row.status,
    purpose: row.purpose,
    approvalReference: row.approval_reference,
    submissionCount: row.submission_count,
    recordCount: row.record_count,
    excludedCount: row.excluded_count,
    manifest: manifestFromJson(row.manifest_json),
  };
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} is invalid JSON: ${message}`);
  }
}
