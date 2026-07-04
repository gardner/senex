import type { AnonymousReportingPayload } from "@/lib/anonymous-reporting";
import {
  EXPORTABLE_RESEARCH_CATEGORIES,
  type ExportableResearchCategory,
  type ResearchExportInput,
  type ResearchExportManifest,
  type ResearchExportRecord,
  type ResearchExportSubmission,
} from "@/lib/admin/research-export-types";

export function emptyResearchExportState() {
  return {
    excludedForConsent: 0,
    excludedForWithdrawal: 0,
    submissions: [] as ResearchExportSubmission[],
    categoryCounts: new Map<ExportableResearchCategory, number>(),
    schemaVersions: new Map<string, number>(),
    consentVersions: new Map<string, number>(),
  };
}

export function addResearchExportManifestCounts(
  state: ReturnType<typeof emptyResearchExportState>,
  payload: AnonymousReportingPayload,
  records: ResearchExportRecord[],
) {
  for (const record of records) {
    state.categoryCounts.set(
      record.category,
      (state.categoryCounts.get(record.category) ?? 0) + 1,
    );
  }
  increment(
    state.schemaVersions,
    `${payload.schemaVersions.local}:${payload.schemaVersions.app}`,
  );
  increment(state.consentVersions, payload.consentSnapshot.termsVersion);
}

export function buildResearchExportManifest(
  exportId: string,
  createdAt: string,
  input: ResearchExportInput,
  reviewedCount: number,
  state: ReturnType<typeof emptyResearchExportState>,
): ResearchExportManifest {
  const recordsExported = state.submissions.reduce(
    (total, submission) => total + submission.records.length,
    0,
  );
  return {
    exportId,
    createdAt,
    purpose: input.purpose,
    approvalReference: input.approvalReference,
    filters: {
      dataCategories: input.dataCategories,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      anonymousStudyIdHash: input.anonymousStudyId
        ? keyedHash("study_filter", input.anonymousStudyId)
        : null,
    },
    counts: {
      submissionsReviewed: reviewedCount,
      submissionsExported: state.submissions.length,
      recordsExported,
      excludedForConsent: state.excludedForConsent,
      excludedForWithdrawal: state.excludedForWithdrawal,
    },
    includedCategories: EXPORTABLE_RESEARCH_CATEGORIES.flatMap((category) => {
      const recordCount = state.categoryCounts.get(category) ?? 0;
      return recordCount > 0 ? [{ category, recordCount }] : [];
    }),
    schemaVersions: versionCounts(state.schemaVersions),
    consentVersions: consentVersionCounts(state.consentVersions),
  };
}

export function manifestFromJson(value: string) {
  try {
    return JSON.parse(value) as ResearchExportManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `stored research export manifest is invalid JSON: ${message}`,
    );
  }
}

export function keyedHash(prefix: string, value: string) {
  return `${prefix}_${stableHash(value)}`;
}

function versionCounts(counts: Map<string, number>) {
  return [...counts.entries()].map(([key, submissionCount]) => {
    const [localSchemaVersion, appVersion] = key.split(":");
    return { localSchemaVersion, appVersion, submissionCount };
  });
}

function consentVersionCounts(counts: Map<string, number>) {
  return [...counts.entries()].map(([termsVersion, submissionCount]) => ({
    termsVersion,
    submissionCount,
  }));
}

function increment(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
