import { expect, test, type Page } from "@playwright/test";

type SyncRequestPayload = {
  records?: {
    consentEvents?: Array<{
      consentType?: string;
      decision?: string;
      dataCategories?: string[];
    }>;
  };
};

test.describe("Anonymous account linking", () => {
  test("requires explicit accepted linking before importing anonymous history", async ({
    page,
  }, testInfo) => {
    const email = `anon-link-${Date.now()}-${testInfo.workerIndex}@example.com`;
    await signUp(page, email);
    await seedAnonymousReportingHistory(page);

    let syncRequests = 0;
    let syncPayload: SyncRequestPayload | null = null;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/account/sessions/sync")
      ) {
        syncRequests += 1;
        syncPayload = request.postDataJSON();
      }
    });

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "Account profile" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Anonymous history linking" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Linking connects this browser's anonymous reporting history to your signed-in account identity.",
      ),
    ).toBeVisible();

    const importButton = page.getByRole("button", {
      name: "Import local history",
    });
    await expect(importButton).toBeDisabled();

    await page.getByRole("button", { name: "Decline linking" }).click();
    await expect(
      page.getByText("Anonymous history was not linked."),
    ).toBeVisible();
    await expect(importButton).toBeDisabled();
    expect(syncRequests).toBe(0);

    const linkButton = page.getByRole("button", {
      name: "Link anonymous history",
    });
    await expect(linkButton).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: /connects my anonymous reporting history and consent trail/,
      })
      .check();
    await expect(linkButton).toBeEnabled();
    await linkButton.click();
    await expect(
      page.getByText("Anonymous history linked to this account."),
    ).toBeVisible();

    await page
      .getByRole("checkbox", { name: /copy my local history to my account/ })
      .check();
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(
      page.getByText("Local history copied to account."),
    ).toBeVisible();
    expect(syncRequests).toBe(1);

    const submittedPayload = syncPayload as SyncRequestPayload | null;
    const linkEvents = submittedPayload?.records?.consentEvents?.filter(
      (event) => event.consentType === "anonymous_account_link",
    );
    expect(linkEvents?.map((event) => event.decision)).toEqual([
      "denied",
      "granted",
    ]);
    expect(
      linkEvents
        ?.at(-1)
        ?.dataCategories?.some((category) => category.startsWith("account:")),
    ).toBe(true);

    await page.screenshot({
      path: testInfo.outputPath("anonymous-account-link.png"),
      fullPage: true,
    });
  });
});

async function signUp(page: Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Anonymous Link Smoke");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a-perfectly-fine-password");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function seedAnonymousReportingHistory(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const reportingPath = "/lib/anonymous-reporting/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    const reporting = await import(/* @vite-ignore */ reportingPath);
    await local.deleteSenexLocalDatabase();
    const profile = await local.getOrCreateLocalProfile();
    await local.saveAnonymousIdentity(
      reporting.createAnonymousIdentityRecord({
        profileId: profile.profileId,
        anonymousStudyId: "study_account_link",
        createdAt: "2026-07-04T00:00:00.000Z",
      }),
    );
    await local.saveConsentRecord(
      reporting.createAnonymousConsentRecord({
        profileId: profile.profileId,
        category: "share_test_summaries",
        decision: "granted",
        decidedAt: "2026-07-04T00:00:10.000Z",
        sourceScreen: "reporting_center",
        consentRecordId: "consent_reporting_summary_granted",
      }),
    );
    const session = await local.startLocalSession({
      cadence: "daily",
      contextSnapshot: { sleepHours: 7 },
      startedAt: "2026-07-04T00:01:00.000Z",
    });
    const taskRun = await local.saveTaskRun({
      taskRunId: "task_run_anonymous_account_link",
      sessionId: session.sessionId,
      taskId: "simple_reaction_time",
      taskVersion: "1.0.0",
      stimulusPackId: "demo_pack",
      stimulusSeed: "seed_1",
      startedAt: "2026-07-04T00:02:00.000Z",
      completedAt: "2026-07-04T00:03:00.000Z",
      summaryScore: { medianRtMs: 418 },
      qualityFlags: [],
    });
    await local.saveScore({
      scoreId: "score_anonymous_account_link",
      sessionId: session.sessionId,
      taskRunId: taskRun.taskRunId,
      domain: "reaction_speed",
      metricName: "median_rt_ms",
      rawValue: 418,
      normalizedValue: null,
      confidence: 0.91,
      qualityFlags: [],
    });
  });
}
