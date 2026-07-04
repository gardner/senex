import { expect, test, type Page } from "@playwright/test";

const now = "2026-07-04T00:00:00.000Z";

test.describe("Admin ingestion status", () => {
  test("shows redacted anonymous ingestion health to admins", async ({
    page,
  }, testInfo) => {
    const email = `admin-ingestion-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await promoteLocalUserToAdmin(page, email);

    const payload = anonymousPayload(
      `study_browser_admin_${testInfo.workerIndex}`,
      `browser_admin_${Date.now()}_${testInfo.workerIndex}`,
    );
    const accepted = await page.request.post(
      "/api/reporting/anonymous/submit",
      {
        data: payload,
      },
    );
    expect(accepted.status()).toBe(201);

    const rejected = await page.request.post(
      "/api/reporting/anonymous/submit",
      {
        data: {
          ...payload,
          idempotencyKey: `${payload.idempotencyKey}_bad`,
          anonymousStudyId: "study_browser_failure_hidden",
          includedCategories: [
            ...payload.includedCategories,
            "share_trial_level_data",
          ],
        },
      },
    );
    expect(rejected.status()).toBe(400);

    await page.goto("/admin/ingestion/status");
    await expect(
      page.getByRole("heading", { name: "Anonymous reporting ingestion" }),
    ).toBeVisible();
    await expect(page.getByText("Accepted").first()).toBeVisible();
    await expect(
      page.getByText("Review the validation error").first(),
    ).toBeVisible();
    await expect(page.getByText("study_browser_failure_hidden")).toHaveCount(0);
    await expect(page.getByText(payload.idempotencyKey)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath("admin-ingestion-status.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Admin Ingestion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-perfectly-fine-password");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function promoteLocalUserToAdmin(page: Page, email: string) {
  const response = await page.request.post("/api/test/admin-role", {
    headers: { "x-senex-test-helper": "admin-role" },
    data: { email },
  });
  expect(response.status()).toBe(200);
}

function anonymousPayload(anonymousStudyId: string, idempotencyKey: string) {
  return {
    payloadVersion: "anonymous-reporting-v1",
    anonymousStudyId,
    identityStatus: "active",
    generatedAt: now,
    scope: { type: "all_existing_history" },
    includedCategories: ["share_test_summaries"],
    consentSnapshot: {
      termsVersion: "anonymous-reporting-v1",
      decisions: {
        share_test_summaries: "granted",
        share_trial_level_data: "missing",
        share_session_context: "missing",
        share_demographics: "missing",
        share_questionnaires: "missing",
        allow_longitudinal_research_use: "missing",
        allow_approved_partner_access: "missing",
      },
      grantedCategories: ["share_test_summaries"],
      latestRecordIds: { share_test_summaries: "consent_browser_admin" },
    },
    data: {
      sessionSummaries: [
        {
          sessionId: "session_browser_admin",
          profileId: "profile_browser_admin",
          startedAt: now,
          completedAt: "2026-07-04T00:05:00.000Z",
          cadence: "daily",
          qualityFlags: [],
        },
      ],
      taskRunSummaries: [
        {
          taskRunId: "task_browser_admin",
          sessionId: "session_browser_admin",
          taskId: "simple_reaction_time",
          taskVersion: "1.0.0",
          stimulusPackId: "pack_1",
          startedAt: now,
          completedAt: "2026-07-04T00:05:00.000Z",
          summaryScore: { medianRtMs: 412 },
          qualityFlags: [],
        },
      ],
      scores: [
        {
          scoreId: "score_browser_admin",
          sessionId: "session_browser_admin",
          taskRunId: "task_browser_admin",
          domain: "reaction_speed",
          metricName: "median_rt_ms",
          rawValue: 412,
          normalizedValue: null,
          confidence: 0.9,
          qualityFlags: [],
          schemaVersion: 1,
          appVersion: "0.1.0",
        },
      ],
    },
    schemaVersions: { local: 1, app: "0.1.0" },
    idempotencyKey,
  };
}
