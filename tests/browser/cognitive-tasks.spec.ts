import { expect, test } from "@playwright/test";

test.describe("cognitive tasks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
  });

  test("runs a reaction time sprint demo and persists local results", async ({
    page,
  }, testInfo) => {
    await page
      .getByRole("button", { name: "Run demo reaction sprint" })
      .click();
    await expect(
      page.getByText("Reaction Time Sprint saved locally."),
    ).toBeVisible();
    await expect(page.getByText(/Median RT: 410 ms/)).toBeVisible();

    const persisted = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      const summary = await local.readLocalStorageSummary();
      const sessions = await local.listAllLocalSessionsForTests();
      const taskRuns = await local.listTaskRunsForSession(
        sessions[0].sessionId,
      );
      const scores = await local.listScores({
        sessionId: sessions[0].sessionId,
        taskRunId: taskRuns[0].taskRunId,
        domain: "reaction_speed",
      });
      return { summary, taskRuns, scores };
    });

    expect(persisted.summary.hasLocalHistory).toBe(true);
    expect(persisted.taskRuns[0].taskVersion).toBe("1.0.0");
    expect(persisted.taskRuns[0].stimulusSeed).toBe("demo-reaction-seed");
    expect(persisted.scores[0].metricName).toBe("median_rt_ms");

    await page.screenshot({
      path: testInfo.outputPath("cognitive-task-demo.png"),
      fullPage: true,
    });
  });

  test("runs the full demo battery and updates local domain cards", async ({
    page,
  }, testInfo) => {
    await page.getByRole("button", { name: "Run full demo battery" }).click();
    await expect(
      page.getByText("Full task battery saved locally."),
    ).toBeVisible();
    await expect(
      page.getByText("Symbol Match correct count:").first(),
    ).toBeVisible();
    await expect(page.getByText("Sequence Tap span:").first()).toBeVisible();
    await expect(
      page.getByText("Seven-Day Learning retention:").first(),
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
      const scores = await local.listScores({});
      return {
        taskIds: taskRuns.flat().map((run: { taskId: string }) => run.taskId),
        scoreDomains: scores.map((score: { domain: string }) => score.domain),
      };
    });

    expect(persisted.taskIds).toEqual(
      expect.arrayContaining([
        "symbol_match",
        "arrow_focus",
        "sequence_tap",
        "pair_learning",
        "seven_day_learning_week",
      ]),
    );
    expect(persisted.scoreDomains).toEqual(
      expect.arrayContaining([
        "processing_speed",
        "attention_control",
        "working_memory",
        "learning_memory",
      ]),
    );

    await page.screenshot({
      path: testInfo.outputPath("cognitive-full-battery.png"),
      fullPage: true,
    });
  });
});
