import { chromium, devices, expect, test, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("critical browser flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearLocalData(page);
    await page.reload();
  });

  test("completes a private session when the browser network is disabled", async ({}, testInfo) => {
    const browser = await chromium.launch();
    const context = await browser.newContext(
      testInfo.project.name === "mobile-chromium"
        ? devices["Pixel 5"]
        : { viewport: { width: 1280, height: 720 } },
    );
    const page = await context.newPage();
    const apiPosts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/")) {
        apiPosts.push(request.url());
      }
    });

    try {
      await page.goto(BASE_URL);
      await clearLocalData(page);
      await page.reload();
      await page
        .getByRole("button", { name: "Use privately on this device" })
        .click();
      await expect(
        page.getByText("Private mode is ready on this browser."),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
      await context.setOffline(true);
      await expect
        .poll(() => page.evaluate(() => navigator.onLine))
        .toBe(false);
      await page
        .getByRole("button", { name: "Run demo reaction sprint" })
        .click();
      await expect(
        page.getByText("Reaction Time Sprint saved locally."),
      ).toBeVisible();

      const persisted = await page.evaluate(async () => {
        const localPath = "/lib/local/index.ts";
        const local = await import(/* @vite-ignore */ localPath);
        const sessions = await local.listAllLocalSessionsForTests();
        const taskRuns = await Promise.all(
          sessions.map((session: { sessionId: string }) =>
            local.listTaskRunsForSession(session.sessionId),
          ),
        );
        return { sessions, taskRuns: taskRuns.flat() };
      });
      expect(persisted.sessions).toHaveLength(1);
      expect(persisted.taskRuns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ taskId: "reaction_time_sprint" }),
        ]),
      );
      expect(apiPosts).toEqual([]);

      await page.screenshot({
        path: testInfo.outputPath("critical-offline-network.png"),
        fullPage: true,
      });
    } finally {
      await browser.close();
    }
  });

  test("withdraws anonymous reporting consent and stops future sharing", async ({
    page,
  }, testInfo) => {
    await seedAnonymousReportingConsent(page);
    await page.reload();

    await expect(page.getByText(/^Study ID: study_/)).toBeVisible();
    await expect(page.getByText("2 active")).toBeVisible();

    await page.getByRole("button", { name: "Stop future sharing" }).click();
    await expect(page.getByText("Future sharing stopped.")).toBeVisible();
    await expect(page.getByText("Status: stopped")).toBeVisible();
    await expect(page.getByText("0 active")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stop future sharing" }),
    ).toBeDisabled();

    const localState = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const reportingPath = "/lib/anonymous-reporting/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const reporting = await import(/* @vite-ignore */ reportingPath);
      const identities = await local.listAnonymousIdentities();
      const consents = await local.listConsentRecords({
        mode: "anonymous_reporting",
      });
      return {
        identities,
        activeConsent: reporting.deriveActiveConsent(consents),
      };
    });
    expect(localState.identities.at(-1)?.status).toBe("stopped");
    expect(localState.activeConsent.grantedCategories).toEqual([]);
    expect(new Set(Object.values(localState.activeConsent.decisions))).toEqual(
      new Set(["withdrawn"]),
    );

    await page.screenshot({
      path: testInfo.outputPath("critical-consent-withdrawal.png"),
      fullPage: true,
    });
  });

  test("persists a hidden-tab quality flag from an interrupted browser task", async ({
    page,
  }, testInfo) => {
    await page.getByRole("button", { name: "Start Symbol Match" }).click();
    const runner = page.getByRole("region", { name: "Symbol Match runner" });
    await expect(runner.getByText("Symbol Match trial 1 of 6")).toBeVisible();

    await simulateHiddenTab(page);
    for (let trialIndex = 1; trialIndex <= 6; trialIndex += 1) {
      await expect(
        runner.getByText(`Symbol Match trial ${trialIndex} of 6`),
      ).toBeVisible();
      const target = await runner
        .getByTestId("symbol-match-target")
        .innerText();
      await runner.getByRole("button", { name: `Choose ${target}` }).click();
    }

    await expect(page.getByText("Symbol Match saved locally.")).toBeVisible();
    const persisted = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const sessions = await local.listAllLocalSessionsForTests();
      const taskRuns = (
        await Promise.all(
          sessions.map((session: { sessionId: string }) =>
            local.listTaskRunsForSession(session.sessionId),
          ),
        )
      ).flat();
      const symbolRun = taskRuns.find(
        (run: { taskId: string }) => run.taskId === "symbol_match",
      );
      if (!symbolRun) throw new Error("Symbol Match task run was not saved.");
      const session = sessions.find(
        (candidate: { sessionId: string }) =>
          candidate.sessionId === symbolRun.sessionId,
      );
      if (!session) throw new Error("Symbol Match session was not saved.");
      const scores = await local.listScores({ taskRunId: symbolRun.taskRunId });
      return { session, symbolRun, scores };
    });

    expect(persisted.session.qualityFlags).toContain("tab_hidden");
    expect(persisted.symbolRun.qualityFlags).toContain("tab_hidden");
    expect(persisted.scores[0].qualityFlags).toContain("tab_hidden");

    await page.screenshot({
      path: testInfo.outputPath("critical-visibility-interruption.png"),
      fullPage: true,
    });
  });
});

async function clearLocalData(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    await local.deleteSenexLocalDatabase();
  });
}

async function seedAnonymousReportingConsent(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const reportingPath = "/lib/anonymous-reporting/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    const reporting = await import(/* @vite-ignore */ reportingPath);
    const profile = await local.getOrCreateLocalProfile();
    const decidedAt = "2026-07-04T00:00:00.000Z";
    await local.saveAnonymousIdentity(
      reporting.createAnonymousIdentityRecord({
        profileId: profile.profileId,
        createdAt: decidedAt,
      }),
    );
    for (const category of [
      "share_test_summaries",
      "allow_longitudinal_research_use",
    ] as const) {
      await local.saveConsentRecord(
        reporting.createAnonymousConsentRecord({
          profileId: profile.profileId,
          category,
          decision: "granted",
          decidedAt,
          sourceScreen: "browser_test",
        }),
      );
    }
  });
}

async function simulateHiddenTab(page: Page) {
  await page.evaluate(() => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      "hidden",
    );
    Object.defineProperty(Document.prototype, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    if (originalDescriptor) {
      Object.defineProperty(Document.prototype, "hidden", originalDescriptor);
    }
  });
}
