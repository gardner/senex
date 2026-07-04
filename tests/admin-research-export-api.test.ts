import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/admin/research-export/route";
import { GET as GET_BY_ID } from "@/app/api/admin/research-export/[exportId]/route";
import { POST as POST_SUBMIT } from "@/app/api/reporting/anonymous/submit/route";
import type { ResearchExportBody } from "@/lib/admin/research-export";
import { auth } from "@/lib/auth";
import { acceptedDataQualityPayload } from "./admin-data-quality-fixtures";

const PASSWORD = "a-perfectly-fine-password";
const inRange = "2026-07-04T00:10:00.000Z";
const oldDate = "2026-06-01T00:10:00.000Z";
const dateFrom = "2026-07-01T00:00:00.000Z";
const dateTo = "2026-07-31T23:59:59.999Z";

describe("admin research export API", () => {
  it("requires a signed-in admin", async () => {
    const anonymous = await POST(exportRequest(exportInput()));
    expect(anonymous.status).toBe(401);

    const user = await signUp("research-export-user@example.com", "user");
    const forbidden = await POST(exportRequest(exportInput(), user.headers));
    expect(forbidden.status).toBe(403);
  });

  it("creates a controlled dataset export and stores a manifest", async () => {
    const admin = await signUp("research-export-admin@example.com", "admin");
    const included = acceptedDataQualityPayload("study_export_target");
    const summaryOnly = summaryOnlyPayload("study_export_summary_only");
    const withdrawn = acceptedDataQualityPayload("study_export_withdrawn");
    const outOfRange = acceptedDataQualityPayload("study_export_old");

    await submitAt(included, inRange, "none");
    await submitAt(summaryOnly, inRange, "none");
    await submitAt(withdrawn, inRange, "withdrawn");
    await submitAt(outOfRange, oldDate, "none");

    const response = await POST(
      exportRequest(
        exportInput({ dataCategories: ["share_trial_level_data"] }),
        admin.headers,
      ),
    );
    expect(response.status).toBe(201);

    const body = (await response.json()) as ResearchExportBody;
    expect(body.exportVersion).toBe("research-export-v1");
    expect(body.status).toBe("completed");
    expect(body.manifest).toMatchObject({
      purpose: "internal_quality_analysis",
      approvalReference: "APPROVAL-2026-001",
      filters: {
        dataCategories: ["share_trial_level_data"],
        dateFrom,
        dateTo,
        anonymousStudyIdHash: null,
      },
      counts: {
        submissionsReviewed: 3,
        submissionsExported: 1,
        recordsExported: 2,
        excludedForConsent: 1,
        excludedForWithdrawal: 1,
      },
    });
    expect(body.manifest.includedCategories).toEqual([
      { category: "share_trial_level_data", recordCount: 2 },
    ]);
    expect(body.dataset.submissions).toHaveLength(1);
    expect(body.dataset.submissions[0].records).toHaveLength(2);
    expect(
      body.dataset.submissions[0].records.every(
        (record) => record.category === "share_trial_level_data",
      ),
    ).toBe(true);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("study_export_target");
    expect(serialized).not.toContain("study_export_summary_only");
    expect(serialized).not.toContain("study_export_withdrawn");
    expect(serialized).not.toContain("study_export_old");
    expect(serialized).not.toContain(included.idempotencyKey);
    expect(serialized).not.toContain(admin.userId);
    expect(serialized).not.toContain("sensitive-answer-value");

    const row = await env.DB.prepare(
      `SELECT export_id, approval_reference, record_count, manifest_json
       FROM research_exports
       WHERE export_id = ?`,
    )
      .bind(body.manifest.exportId)
      .first<{
        export_id: string;
        approval_reference: string;
        record_count: number;
        manifest_json: string;
      }>();
    expect(row?.approval_reference).toBe("APPROVAL-2026-001");
    expect(row?.record_count).toBe(2);
    expect(JSON.parse(row?.manifest_json ?? "{}")).toMatchObject(body.manifest);

    const listed = await GET(exportRequest({}, admin.headers));
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({
      status: "ok",
      exports: [
        {
          exportId: body.manifest.exportId,
          recordCount: 2,
          submissionCount: 1,
          approvalReference: "APPROVAL-2026-001",
        },
      ],
    });

    const manifest = await GET_BY_ID(
      exportByIdRequest(body.manifest.exportId, admin.headers),
      { params: Promise.resolve({ exportId: body.manifest.exportId }) },
    );
    expect(manifest.status).toBe(200);
    expect(await manifest.json()).toMatchObject({
      status: "ok",
      manifest: body.manifest,
    });
  });

  it("filters exports by anonymous study without storing the raw study id", async () => {
    const admin = await signUp(
      "research-export-study-admin@example.com",
      "admin",
    );
    const target = acceptedDataQualityPayload("study_filter_target");
    const other = acceptedDataQualityPayload("study_filter_other");
    await submitAt(target, inRange, "none");
    await submitAt(other, inRange, "none");

    const response = await POST(
      exportRequest(
        exportInput({
          dataCategories: ["share_test_summaries"],
          anonymousStudyId: "study_filter_target",
        }),
        admin.headers,
      ),
    );
    expect(response.status).toBe(201);

    const body = (await response.json()) as ResearchExportBody;
    expect(body.manifest.counts).toMatchObject({
      submissionsReviewed: 1,
      submissionsExported: 1,
      recordsExported: 5,
    });
    expect(body.manifest.filters.anonymousStudyIdHash).toEqual(
      expect.any(String),
    );
    expect(JSON.stringify(body)).not.toContain("study_filter_target");
    expect(JSON.stringify(body)).not.toContain("study_filter_other");
  });
});

async function signUp(email: string, role: "admin" | "user") {
  const { response, headers } = await auth.api.signUpEmail({
    body: { name: "Research Export", email, password: PASSWORD },
    returnHeaders: true,
  });
  if (role === "admin") {
    await env.DB.prepare("UPDATE user SET role = 'admin' WHERE id = ?")
      .bind(response.user.id)
      .run();
  }
  const cookie = headers.get("set-cookie");
  expect(cookie).toBeTruthy();
  return {
    userId: response.user.id,
    headers: new Headers({ cookie: cookie! }),
  };
}

async function submitAt(
  payload: ReturnType<typeof acceptedDataQualityPayload>,
  receivedAt: string,
  deletionStatus: string,
) {
  const response = await POST_SUBMIT(submitRequest(payload));
  expect(response.status).toBe(201);
  await env.DB.prepare(
    `UPDATE anonymous_research_submissions
     SET received_at = ?, deletion_request_status = ?
     WHERE idempotency_key = ?`,
  )
    .bind(receivedAt, deletionStatus, payload.idempotencyKey)
    .run();
}

function summaryOnlyPayload(anonymousStudyId: string) {
  const payload = acceptedDataQualityPayload(anonymousStudyId);
  payload.includedCategories = ["share_test_summaries"];
  payload.consentSnapshot.grantedCategories = ["share_test_summaries"];
  payload.consentSnapshot.decisions.share_trial_level_data = "missing";
  payload.consentSnapshot.decisions.share_session_context = "missing";
  payload.consentSnapshot.decisions.share_demographics = "missing";
  payload.consentSnapshot.decisions.share_questionnaires = "missing";
  payload.data = {
    sessionSummaries: payload.data.sessionSummaries,
    taskRunSummaries: payload.data.taskRunSummaries,
    scores: payload.data.scores,
  };
  payload.idempotencyKey = `${payload.idempotencyKey}_summary`;
  return payload;
}

function exportInput(
  overrides: Partial<{
    dataCategories: string[];
    anonymousStudyId: string;
  }> = {},
) {
  return {
    purpose: "internal_quality_analysis",
    approvalReference: "APPROVAL-2026-001",
    dataCategories: overrides.dataCategories ?? ["share_test_summaries"],
    dateFrom,
    dateTo,
    anonymousStudyId: overrides.anonymousStudyId,
  };
}

function exportRequest(payload: unknown, headers = new Headers()) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("content-type", "application/json");
  return new Request("https://senex.nz/api/admin/research-export", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
  });
}

function exportByIdRequest(exportId: string, headers = new Headers()) {
  return new Request(`https://senex.nz/api/admin/research-export/${exportId}`, {
    method: "GET",
    headers,
  });
}

function submitRequest(payload: unknown) {
  return new Request("https://senex.nz/api/reporting/anonymous/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}
