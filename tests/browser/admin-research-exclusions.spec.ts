import { expect, test, type Page } from "@playwright/test";

const now = "2026-07-04T00:00:00.000Z";

test.describe("Admin research exclusions", () => {
  test("records future research exclusion with an audit reason", async ({
    page,
  }, testInfo) => {
    const email = `admin-exclusion-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await promoteLocalUserToAdmin(page, email);

    const fixtureId = `${Date.now()}_${testInfo.workerIndex}`;
    const payload = anonymousPayload(
      `study_browser_exclusion_${fixtureId}`,
      `browser_exclusion_${fixtureId}`,
    );
    const accepted = await page.request.post(
      "/api/reporting/anonymous/submit",
      { data: payload },
    );
    expect(accepted.status()).toBe(201);

    await page.goto("/admin/research-exclusions");
    await expect(
      page.getByRole("heading", { name: "Research exclusions" }),
    ).toBeVisible();

    await page.getByLabel("Anonymous study ID").fill(payload.anonymousStudyId);
    await page
      .getByLabel("Audit reason")
      .fill("participant requested future exclusion");
    await page.getByRole("button", { name: "Mark excluded" }).click();

    await expect(page.getByText("Exclusion recorded")).toBeVisible();
    await expect(page.getByLabel("Submissions changed: 1")).toBeVisible();
    await expect(page.getByText(/already generated exports/i)).toBeVisible();
    await expect(page.getByText(payload.idempotencyKey)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath("admin-research-exclusions.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Admin Exclusion");
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
      latestRecordIds: { share_test_summaries: "consent_browser_exclusion" },
    },
    data: {
      sessionSummaries: [
        {
          sessionId: "session_browser_exclusion",
          profileId: "profile_browser_exclusion",
          startedAt: now,
          completedAt: "2026-07-04T00:05:00.000Z",
          cadence: "daily",
          qualityFlags: [],
        },
      ],
      taskRunSummaries: [
        {
          taskRunId: "task_browser_exclusion",
          sessionId: "session_browser_exclusion",
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
          scoreId: "score_browser_exclusion",
          sessionId: "session_browser_exclusion",
          taskRunId: "task_browser_exclusion",
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
