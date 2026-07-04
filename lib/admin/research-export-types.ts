import type { ConsentCategoryId } from "@/lib/anonymous-reporting";

export const EXPORTABLE_RESEARCH_CATEGORIES = [
  "share_test_summaries",
  "share_trial_level_data",
  "share_session_context",
  "share_demographics",
  "share_questionnaires",
] as const satisfies readonly ConsentCategoryId[];

export type ExportableResearchCategory =
  (typeof EXPORTABLE_RESEARCH_CATEGORIES)[number];

export type ResearchExportInput = {
  purpose: string;
  approvalReference: string;
  dataCategories: ExportableResearchCategory[];
  dateFrom: string | null;
  dateTo: string | null;
  anonymousStudyId: string | null;
};

export type ResearchExportManifest = {
  exportId: string;
  createdAt: string;
  purpose: string;
  approvalReference: string;
  filters: {
    dataCategories: ExportableResearchCategory[];
    dateFrom: string | null;
    dateTo: string | null;
    anonymousStudyIdHash: string | null;
  };
  counts: {
    submissionsReviewed: number;
    submissionsExported: number;
    recordsExported: number;
    excludedForConsent: number;
    excludedForWithdrawal: number;
  };
  includedCategories: Array<{
    category: ExportableResearchCategory;
    recordCount: number;
  }>;
  schemaVersions: Array<{
    localSchemaVersion: string;
    appVersion: string;
    submissionCount: number;
  }>;
  consentVersions: Array<{ termsVersion: string; submissionCount: number }>;
};

export type ResearchExportRecord = {
  category: ExportableResearchCategory;
  recordType: string;
  record: unknown;
};

export type ResearchExportSubmission = {
  subjectKey: string;
  submissionKey: string;
  receivedAt: string;
  categories: ExportableResearchCategory[];
  records: ResearchExportRecord[];
};
