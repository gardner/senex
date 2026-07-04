import {
  CONSENT_CATEGORIES,
  deriveActiveConsent,
  type AnonymousReportingScope,
} from "@/lib/anonymous-reporting";
import type {
  AnonymousIdentityRecord,
  ConsentRecord,
  ReportingUploadRecord,
} from "@/lib/local";
import {
  listAnonymousIdentities,
  listConsentRecords,
  listQuestionnaireAnswers,
  listReportingUploads,
  saveReportingUpload,
} from "@/lib/local";
import {
  captureEngineeringTelemetry,
  classifyTelemetryFailure,
} from "@/lib/telemetry";
import {
  P0_RESEARCH_PROFILE_QUESTIONNAIRES,
  buildResearchProfileCompletionState,
  type ResearchProfileCompletionState,
} from "@/lib/questionnaires";

import type { ReportingScopeType } from "./panel-controls";

export type ReportingSnapshot = {
  identities: AnonymousIdentityRecord[];
  consents: ConsentRecord[];
  uploads: ReportingUploadRecord[];
  completion: ResearchProfileCompletionState;
};

export async function readReportingSnapshot(): Promise<ReportingSnapshot> {
  const [identities, consents, uploads, answers] = await Promise.all([
    listAnonymousIdentities(),
    listConsentRecords({ mode: "anonymous_reporting" }),
    listReportingUploads(),
    listQuestionnaireAnswers({}),
  ]);
  return {
    identities,
    consents,
    uploads,
    completion: buildResearchProfileCompletionState({
      questionnaires: P0_RESEARCH_PROFILE_QUESTIONNAIRES,
      answers,
    }),
  };
}

export function selectIdentity(identities: AnonymousIdentityRecord[]) {
  return (
    identities.find((record) => record.status === "active") ??
    identities.find((record) => record.status === "paused") ??
    identities.at(-1) ??
    null
  );
}

export function checkedFromConsent(
  consent: ReturnType<typeof deriveActiveConsent>,
) {
  return Object.fromEntries(
    CONSENT_CATEGORIES.map((category) => [
      category.id,
      consent.decisions[category.id] === "granted",
    ]),
  );
}

export function selectedScope(
  scopeType: ReportingScopeType,
  rangeStart: string,
  rangeEnd: string,
): AnonymousReportingScope {
  if (scopeType === "from_today")
    return { type: "from_today", today: todayString() };
  if (scopeType === "date_range") {
    return {
      type: "date_range",
      from: `${rangeStart || todayString()}T00:00:00.000Z`,
      to: `${rangeEnd || rangeStart || todayString()}T23:59:59.999Z`,
    };
  }
  return { type: "all_existing_history" };
}

export function latestSubmittableUpload(uploads: ReportingUploadRecord[]) {
  return uploads
    .toReversed()
    .find((upload) => upload.status === "queued" || upload.status === "failed");
}

export async function submitReportingUpload(upload: ReportingUploadRecord) {
  const submittedAt = new Date().toISOString();
  const submitting = {
    ...upload,
    status: "submitting" as const,
    submittedAt,
    lastError: null,
  };
  await saveReportingUpload(submitting);
  try {
    const response = await fetch("/api/reporting/anonymous/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(upload.payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessage(body));
    await saveReportingUpload({
      ...submitting,
      status: "succeeded",
      completedAt: new Date().toISOString(),
    });
  } catch (caught) {
    await saveReportingUpload({
      ...submitting,
      status: "failed",
      completedAt: new Date().toISOString(),
      lastError: caught instanceof Error ? caught.message : String(caught),
    });
    void captureEngineeringTelemetry({
      type: "anonymous_upload_failure",
      mode: "anonymous_reporting",
      occurredAt: new Date().toISOString(),
      details: {
        operation: "submit",
        reason: classifyTelemetryFailure(caught),
        includedCategoryCount: upload.includedCategories.length,
      },
    });
    throw caught;
  }
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function errorMessage(body: unknown) {
  if (typeof body === "object" && body && "error" in body) {
    return String(body.error);
  }
  return "Anonymous reporting upload failed.";
}
