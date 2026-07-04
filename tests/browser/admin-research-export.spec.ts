import { expect, test, type Page } from "@playwright/test";

const now = "2026-07-04T00:00:00.000Z";

test.describe("Admin research export", () => {
  test("creates a controlled research export with a stored manifest", async ({
    page,
  }, testInfo) => {
    const email = `admin-export-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await promoteLocalUserToAdmin(page, email);

    const fixtureId = `${Date.now()}_${testInfo.workerIndex}`;
    const payload = anonymousPayload(
      `study_browser_export_${fixtureId}`,
      `browser_export_${fixtureId}`,
    );
    const accepted = await page.request.post(
      "/api/reporting/anonymous/submit",
      { data: payload },
    );
    expect(accepted.status()).toBe(201);

    await page.goto("/admin/research-export");
    await expect(
      page.getByRole("heading", { name: "Research export" }),
    ).toBeVisible();

    await page.getByLabel("Purpose").fill("browser quality export");
    await page.getByLabel("Approval reference").fill("BROWSER-EXPORT-001");
    await page.getByLabel("Date from").fill("2026-07-01T00:00");
    await page.getByLabel("Date to").fill("2026-07-31T23:59");
    await page
      .getByLabel("Anonymous study ID filter")
      .fill(payload.anonymousStudyId);
    await page.getByLabel("Test summaries").uncheck();
    await page.getByLabel("Trial-level data").check();
    await page.getByRole("button", { name: "Create export" }).click();

    await expect(page.getByText("Export complete")).toBeVisible();
    await expect(page.getByLabel("Records exported: 2")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download JSON" }),
    ).toBeVisible();
    await expect(page.getByText(payload.anonymousStudyId)).toHaveCount(0);
    await expect(page.getByText(payload.idempotencyKey)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath("admin-research-export.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Admin Export");
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
    includedCategories: ["share_test_summaries", "share_trial_level_data"],
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
      share_session_context: "missing",
      share_demographics: "missing",
      share_questionnaires: "missing",
      allow_longitudinal_research_use: "missing",
      allow_approved_partner_access: "missing",
    },
    grantedCategories: ["share_test_summaries", "share_trial_level_data"],
    latestRecordIds: { share_test_summaries: "consent_browser_export" },
  };
}

function payloadData() {
  return {
    sessionSummaries: [
      {
        sessionId: "session_browser_export",
        profileId: "profile_browser_export",
        startedAt: now,
        completedAt: "2026-07-04T00:05:00.000Z",
        cadence: "daily",
        qualityFlags: [],
      },
    ],
    taskRunSummaries: [
      {
        taskRunId: "task_browser_export",
        sessionId: "session_browser_export",
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
      trialEvent("trial_browser_export_0", 0, []),
      trialEvent("trial_browser_export_1", 1, ["too_fast"]),
    ],
  };
}

function trialEvent(
  trialEventId: string,
  trialIndex: number,
  eventFlags: string[],
) {
  return {
    trialEventId,
    taskRunId: "task_browser_export",
    trialIndex,
    stimulus: { kind: "circle" },
    expectedResponse: "space",
    actualResponse: "space",
    correct: true,
    stimulusOnsetTime: 10,
    responseTime: 420,
    rtMs: 410,
    eventFlags,
    schemaVersion: 3,
    appVersion: "0.1.0",
  };
}
