import { expect, test, type Page } from "@playwright/test";

const now = "2026-07-04T00:00:00.000Z";

test.describe("Admin data quality", () => {
  test("shows aggregate anonymous research quality metrics", async ({
    page,
  }, testInfo) => {
    const email = `admin-quality-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await promoteLocalUserToAdmin(page, email);

    const payload = anonymousPayload(
      `study_browser_quality_${testInfo.workerIndex}`,
      `browser_quality_${Date.now()}_${testInfo.workerIndex}`,
    );
    const accepted = await page.request.post(
      "/api/reporting/anonymous/submit",
      { data: payload },
    );
    expect(accepted.status()).toBe(201);

    await page.goto("/admin/data-quality");
    await expect(
      page.getByRole("heading", { name: "Data quality dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Completion").first()).toBeVisible();
    await expect(page.getByText("Invalid trials").first()).toBeVisible();
    await expect(page.getByText("Privacy guardrails").first()).toBeVisible();
    await expect(page.getByText("External release").first()).toBeVisible();
    await expect(page.getByText("Minimum cohort").first()).toBeVisible();
    await expect(page.getByText("Suppressed cells").first()).toBeVisible();
    await expect(page.getByText("Drop-off by test").first()).toBeVisible();
    await expect(
      page.getByText("Missing questionnaire fields").first(),
    ).toBeVisible();
    await expect(page.getByText("too_fast").first()).toBeVisible();
    await expect(page.getByText(payload.anonymousStudyId)).toHaveCount(0);
    await expect(page.getByText(payload.idempotencyKey)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath("admin-data-quality.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Admin Quality");
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
    includedCategories: [
      "share_test_summaries",
      "share_trial_level_data",
      "share_session_context",
      "share_demographics",
      "share_questionnaires",
    ],
    consentSnapshot: consentSnapshot(),
    data: payloadData(),
    schemaVersions: { local: 3, app: "0.1.0" },
    idempotencyKey,
  };
}

function consentSnapshot() {
  return {
    termsVersion: "anonymous-reporting-v1",
    decisions: {
      share_test_summaries: "granted",
      share_trial_level_data: "granted",
      share_session_context: "granted",
      share_demographics: "granted",
      share_questionnaires: "granted",
      allow_longitudinal_research_use: "missing",
      allow_approved_partner_access: "missing",
    },
    grantedCategories: [
      "share_test_summaries",
      "share_trial_level_data",
      "share_session_context",
      "share_demographics",
      "share_questionnaires",
    ],
    latestRecordIds: { share_test_summaries: "consent_browser_quality" },
  };
}

function payloadData() {
  return {
    sessionSummaries: [
      {
        sessionId: "session_browser_quality",
        profileId: "profile_browser_quality",
        startedAt: now,
        completedAt: "2026-07-04T00:05:00.000Z",
        cadence: "daily",
        qualityFlags: [],
      },
    ],
    taskRunSummaries: [
      {
        taskRunId: "task_browser_quality",
        sessionId: "session_browser_quality",
        taskId: "simple_reaction_time",
        taskVersion: "1.0.0",
        stimulusPackId: "pack_1",
        startedAt: now,
        completedAt: "2026-07-04T00:05:00.000Z",
        summaryScore: { medianRtMs: 412 },
        qualityFlags: [],
      },
    ],
    scores: [],
    trialEvents: [
      {
        trialEventId: "trial_browser_quality",
        taskRunId: "task_browser_quality",
        trialIndex: 0,
        stimulus: { kind: "circle" },
        expectedResponse: "space",
        actualResponse: "space",
        correct: true,
        stimulusOnsetTime: 10,
        responseTime: 12,
        rtMs: 2,
        eventFlags: ["too_fast"],
        schemaVersion: 3,
        appVersion: "0.1.0",
      },
    ],
    sessionContext: [
      {
        sessionId: "session_browser_quality",
        contextSnapshot: { deviceType: "desktop", inputMethod: "keyboard" },
        qualityFlags: [],
      },
    ],
    demographics: [],
    questionnaireAnswers: [],
  };
}
