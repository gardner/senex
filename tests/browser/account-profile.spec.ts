import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe("Account profile", () => {
  test("lets a signed-in user view and update basic profile fields", async ({
    page,
  }, testInfo) => {
    const email = `account-${Date.now()}-${testInfo.workerIndex}@example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Profile Smoke");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("a-perfectly-fine-password");
    const signUpButton = page.getByRole("button", {
      name: "Sign up",
      exact: true,
    });
    await expect(signUpButton).toBeEnabled();
    await signUpButton.click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "Account profile" }),
    ).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: email }),
    ).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue("Profile Smoke");

    await page.getByLabel("Display name").fill("Updated Profile Smoke");
    await page
      .getByLabel("Profile image URL")
      .fill("https://example.com/avatar.png");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByText("Account profile saved.")).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue(
      "Updated Profile Smoke",
    );
    await expect(
      page.getByRole("heading", { name: "Account data controls" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export account data" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Request account deletion" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Account updates do not change research consent."),
    ).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("account-profile.png"),
      fullPage: true,
    });
  });

  test("redirects signed-out account visitors", async ({ page }) => {
    await page.goto("/account");

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("requires confirmation before importing local history into an account", async ({
    page,
  }, testInfo) => {
    const email = `sync-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await seedLocalHistory(page);

    let syncRequests = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/account/sessions/sync")
      ) {
        syncRequests += 1;
      }
    });

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "Account sync" }),
    ).toBeVisible();
    await expect(page.getByText("1 local session")).toBeVisible();
    await expect(page.getByText("1 task run")).toBeVisible();
    await expect(
      page.getByText("Research sharing is managed separately."),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Share synced history for research" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Cancel import" }).click();
    await expect(
      page.getByText("Local history was not uploaded."),
    ).toBeVisible();
    expect(syncRequests).toBe(0);

    const importButton = page.getByRole("button", {
      name: "Import local history",
    });
    await expect(importButton).toBeDisabled();
    await page
      .getByRole("checkbox", { name: /copy my local history to my account/ })
      .check();
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(
      page.getByText("Local history copied to account."),
    ).toBeVisible();
    expect(syncRequests).toBe(1);

    const localSummary = await readLocalHistorySummary(page);
    expect(localSummary.hasLocalHistory).toBe(true);
    expect(localSummary.sessionCount).toBe(1);

    await page.screenshot({
      path: testInfo.outputPath("account-sync-import.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Sync Smoke");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-perfectly-fine-password");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedLocalHistory(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    await local.deleteSenexLocalDatabase();
    const session = await local.startLocalSession({
      cadence: "daily",
      contextSnapshot: { sleepHours: 7 },
      startedAt: "2026-07-04T00:00:00.000Z",
    });
    const taskRun = await local.saveTaskRun({
      taskRunId: "task_run_account_sync",
      sessionId: session.sessionId,
      taskId: "simple_reaction_time",
      taskVersion: "1.0.0",
      stimulusPackId: "demo_pack",
      stimulusSeed: "seed_1",
      startedAt: "2026-07-04T00:01:00.000Z",
      completedAt: "2026-07-04T00:02:00.000Z",
      summaryScore: { medianRtMs: 412 },
      qualityFlags: [],
    });
    await local.saveTrialEvents([
      {
        trialEventId: "trial_account_sync",
        taskRunId: taskRun.taskRunId,
        trialIndex: 0,
        stimulus: { shape: "circle" },
        expectedResponse: "space",
        actualResponse: "space",
        correct: true,
        stimulusOnsetTime: 1000,
        responseTime: 1412,
        rtMs: 412,
        eventFlags: [],
      },
    ]);
    await local.saveScore({
      scoreId: "score_account_sync",
      sessionId: session.sessionId,
      taskRunId: taskRun.taskRunId,
      domain: "reaction_speed",
      metricName: "median_rt_ms",
      rawValue: 412,
      normalizedValue: null,
      confidence: 0.9,
      qualityFlags: [],
    });
  });
}

async function readLocalHistorySummary(page: Page) {
  return page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    const summary = await local.readLocalStorageSummary();
    const sessions = await local.listAllLocalSessionsForTests();
    return {
      hasLocalHistory: summary.hasLocalHistory,
      sessionCount: sessions.length,
    };
  });
}
