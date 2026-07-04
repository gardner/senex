import {
  EXPORTABLE_RESEARCH_CATEGORIES,
  type ExportableResearchCategory,
  type ResearchExportInput,
} from "@/lib/admin/research-export-types";

const EXPORTABLE = new Set<string>(EXPORTABLE_RESEARCH_CATEGORIES);

export function validateResearchExportInput(
  value: unknown,
): ResearchExportInput {
  const input = record(value, "payload");
  const purpose = nonEmptyString(input.purpose, "purpose");
  const approvalReference = nonEmptyString(
    input.approvalReference,
    "approvalReference",
  );
  const dataCategories = categories(input.dataCategories);
  const dateFrom = optionalIsoString(input.dateFrom, "dateFrom");
  const dateTo = optionalIsoString(input.dateTo, "dateTo");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("dateFrom must be before dateTo");
  }
  return {
    purpose,
    approvalReference,
    dataCategories,
    dateFrom,
    dateTo,
    anonymousStudyId: optionalString(input.anonymousStudyId),
  };
}

function categories(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("dataCategories must be a non-empty array");
  }
  const unique = [...new Set(value)];
  for (const category of unique) {
    if (typeof category !== "string" || !EXPORTABLE.has(category)) {
      throw new Error(
        `Unsupported research export category: ${String(category)}`,
      );
    }
  }
  return unique as ExportableResearchCategory[];
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

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function optionalIsoString(value: unknown, name: string) {
  const next = optionalString(value);
  if (next === null) return null;
  if (!Number.isFinite(Date.parse(next))) {
    throw new Error(`${name} must be a valid date string`);
  }
  return next;
}
