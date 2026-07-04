import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

test.describe("Account data controls", () => {
  test("exports account-linked history and requests account deletion", async ({
    page,
  }, testInfo) => {
    const email = `account-data-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await seedLocalHistory(page);
    await importLocalHistory(page);

    const exportButton = page.getByRole("button", {
      name: "Export account data",
    });
    await expect(exportButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const exportJson = JSON.parse(
      await readFile(downloadPath!, "utf8"),
    ) as AccountExportDownload;
    expect(exportJson.exportVersion).toBe("account-export-v1");
    expect(exportJson.account.email).toBe(email);
    expect(exportJson.records.sessions[0].localSessionId).toBe(
      "account_data_session",
    );
    expect(exportJson.records.consentEvents[0].localConsentRecordId).toBe(
      "account_data_consent",
    );

    await expect(
      page.getByText("Already shared research submissions"),
    ).toBeVisible();
    const requestButton = page.getByRole("button", {
      name: "Request account deletion",
    });
    await expect(requestButton).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: /I understand this creates a deletion request/,
      })
      .check();
    await expect(requestButton).toBeEnabled();
    await requestButton.click();
    await expect(page.getByText("Deletion request received.")).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("account-data-controls.png"),
      fullPage: true,
    });
  });
});

type AccountExportDownload = {
  exportVersion: string;
  account: { email: string };
  records: {
    sessions: Array<{ localSessionId: string }>;
    consentEvents: Array<{ localConsentRecordId: string }>;
  };
};

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Account Data Smoke");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-perfectly-fine-password");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function importLocalHistory(page: Page) {
  await page.goto("/account");
  await page
    .getByRole("checkbox", { name: /copy my local history to my account/ })
    .check();
  await page.getByRole("button", { name: "Import local history" }).click();
  await expect(
    page.getByText("Local history copied to account."),
  ).toBeVisible();
}

async function seedLocalHistory(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    await local.deleteSenexLocalDatabase();
    const profile = await local.getOrCreateLocalProfile();
    const session = await local.saveLocalSessionForTests({
      sessionId: "account_data_session",
      profileId: profile.profileId,
      startedAt: "2026-07-04T00:00:00.000Z",
      completedAt: "2026-07-04T00:05:00.000Z",
      cadence: "daily",
      contextSnapshot: { sleepHours: 7 },
      qualityFlags: [],
    });
    const taskRun = await local.saveTaskRun({
      taskRunId: "account_data_task_run",
      sessionId: session.sessionId,
      taskId: "simple_reaction_time",
      taskVersion: "1.0.0",
      stimulusPackId: "demo_pack",
      stimulusSeed: "seed_1",
      startedAt: "2026-07-04T00:01:00.000Z",
      completedAt: "2026-07-04T00:02:00.000Z",
      summaryScore: { medianRtMs: 405 },
      qualityFlags: [],
    });
    await local.saveScore({
      scoreId: "account_data_score",
      sessionId: session.sessionId,
      taskRunId: taskRun.taskRunId,
      domain: "reaction_speed",
      metricName: "median_rt_ms",
      rawValue: 405,
      normalizedValue: null,
      confidence: 0.92,
      qualityFlags: [],
    });
    await local.saveConsentRecord({
      consentRecordId: "account_data_consent",
      profileId: profile.profileId,
      mode: "signed_in",
      consentType: "account_sync",
      version: "2026-07-04",
      decision: "granted",
      decidedAt: "2026-07-04T00:03:00.000Z",
      sourceScreen: "account_sync",
      dataCategories: ["account_history"],
    });
  });
}
