import { expect, test } from "@playwright/test";

test.describe("local data platform", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
  });

  test("initializes, migrates, and rejects future local schema versions", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);

      const emptySummary = await local.readLocalStorageSummary();
      const profile = await local.getOrCreateLocalProfile();
      const currentSummary = await local.readLocalStorageSummary();

      await local.setLocalSchemaVersionForTests(0);
      await local.runLocalMigrations();
      const migratedSummary = await local.readLocalStorageSummary();

      await local.setLocalSchemaVersionForTests(99);
      let futureError = "";
      try {
        await local.runLocalMigrations();
      } catch (error) {
        futureError = error instanceof Error ? error.message : String(error);
      }

      return {
        emptySummary,
        profile,
        currentSummary,
        migratedSummary,
        futureError,
      };
    });

    expect(result.emptySummary.hasLocalHistory).toBe(false);
    expect(result.profile.mode).toBe("offline");
    expect(result.currentSummary.hasLocalHistory).toBe(true);
    expect(result.currentSummary.localProfileId).toBe(result.profile.profileId);
    expect(result.migratedSummary.schemaVersion).toBe(1);
    expect(result.futureError).toContain("future local schema");
  });

  test("persists sessions, task runs, trial events, and scores", async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);

      const profile = await local.getOrCreateLocalProfile();
      const session = await local.startLocalSession({
        cadence: "daily",
        contextSnapshot: { sleepHours: 7, caffeine: "morning" },
      });

      await local.completeLocalSession(session.sessionId, {
        completedAt: "2026-07-04T01:00:00.000Z",
        qualityFlags: ["demo_complete"],
      });

      const taskRun = await local.saveTaskRun({
        taskRunId: "task_run_demo",
        sessionId: session.sessionId,
        taskId: "simple_reaction_time",
        taskVersion: "1.0.0",
        stimulusPackId: "demo_pack",
        stimulusSeed: "seed_1",
        startedAt: "2026-07-04T00:59:00.000Z",
        completedAt: "2026-07-04T01:00:00.000Z",
        summaryScore: { medianRtMs: 412 },
        qualityFlags: [],
      });

      await local.saveTrialEvents([
        {
          trialEventId: "trial_1",
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
        scoreId: "score_1",
        sessionId: session.sessionId,
        taskRunId: taskRun.taskRunId,
        domain: "reaction_speed",
        metricName: "median_rt_ms",
        rawValue: 412,
        normalizedValue: null,
        confidence: 0.9,
        qualityFlags: ["baseline_forming"],
      });

      const storedSession = await local.getLocalSession(session.sessionId);
      const taskRuns = await local.listTaskRunsForSession(session.sessionId);
      const trials = await local.listTrialEventsForTaskRun(taskRun.taskRunId);
      const scores = await local.listScores({
        sessionId: session.sessionId,
        taskRunId: taskRun.taskRunId,
        domain: "reaction_speed",
        metricName: "median_rt_ms",
      });
      const returningProfile = await local.getOrCreateLocalProfile();

      return {
        profile,
        returningProfile,
        storedSession,
        taskRuns,
        trials,
        scores,
      };
    });

    expect(result.returningProfile.profileId).toBe(result.profile.profileId);
    expect(result.storedSession?.completedAt).toBe("2026-07-04T01:00:00.000Z");
    expect(result.storedSession?.qualityFlags).toContain("demo_complete");
    expect(result.taskRuns).toHaveLength(1);
    expect(result.trials[0].rtMs).toBe(412);
    expect(result.scores).toHaveLength(1);
    expect(result.scores[0].metricName).toBe("median_rt_ms");
  });

  test("shows local storage status and persistence messaging", async ({
    page,
  }, testInfo) => {
    await expect(
      page.getByRole("heading", { name: "Choose how to use Senex" }),
    ).toBeVisible();
    await expect(page.getByText("No local history yet.")).toBeVisible();

    await page
      .getByRole("button", { name: "Use privately on this device" })
      .click();
    await expect(
      page.getByText("Local history exists on this browser."),
    ).toBeVisible();
    await expect(page.getByText(/Last local save:/)).toBeVisible();

    await page
      .getByRole("button", { name: "Request persistent storage" })
      .click();
    await expect(
      page.getByText(
        /persistent storage (is enabled|was not granted|requests)/,
      ),
    ).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("local-storage-status.png"),
      fullPage: true,
    });
  });
});
