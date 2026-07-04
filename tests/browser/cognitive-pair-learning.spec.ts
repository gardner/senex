import { expect, test, type Locator } from "@playwright/test";

test.describe("Pair Learning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
  });

  test("captures study, immediate, delayed, and recognition phases", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile-chromium";
    await page.getByRole("button", { name: "Start Pair Learning" }).click();
    const runner = page.getByRole("region", { name: "Pair Learning runner" });
    await expect(runner.getByText("Study the pairs")).toBeVisible();
    await runner
      .getByRole("button", { name: "Start immediate recall" })
      .click();

    for (let index = 1; index <= 3; index += 1) {
      await expect(
        runner.getByText(`Immediate recall ${index} of 3`),
      ).toBeVisible();
      await chooseCurrentTarget(runner, isMobile, "Choose");
    }

    await expect(runner.getByText("Delay marker: 1000 ms")).toBeVisible();
    await runner.getByRole("button", { name: "Start delayed recall" }).click();

    for (let index = 1; index <= 3; index += 1) {
      await expect(
        runner.getByText(`Delayed recall ${index} of 3`),
      ).toBeVisible();
      await chooseCurrentTarget(runner, isMobile, "Choose");
    }

    for (let index = 1; index <= 3; index += 1) {
      await expect(runner.getByText(`Recognition ${index} of 3`)).toBeVisible();
      await chooseCurrentTarget(runner, isMobile, "Recognize");
    }

    await expect(page.getByText("Pair Learning saved locally.")).toBeVisible();
    await expect(runner.getByText("Immediate accuracy:")).toBeVisible();

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
      const pairRun = taskRuns.find(
        (run: { taskId: string }) => run.taskId === "pair_learning",
      );
      if (!pairRun) throw new Error("Pair Learning task run was not saved.");
      const pairSession = sessions.find(
        (session: { sessionId: string }) =>
          session.sessionId === pairRun.sessionId,
      );
      if (!pairSession) throw new Error("Pair Learning session was not saved.");
      const trials = await local.listTrialEventsForTaskRun(pairRun.taskRunId);
      const scores = await local.listScores({ taskRunId: pairRun.taskRunId });
      return { pairRun, pairSession, scores, trials };
    });

    expect(persisted.pairRun).toMatchObject({
      taskVersion: "1.0.0",
      stimulusSeed: "interactive-pair-learning-v1",
    });
    expect(persisted.trials).toHaveLength(9);
    expect(persisted.pairSession.contextSnapshot).toMatchObject({
      interactive: true,
      taskId: "pair_learning",
    });
    expect(persisted.pairSession.contextSnapshot.demo).toBeUndefined();
    expect(
      persisted.trials.some(
        (trial: { stimulus: { phase?: string; delayDurationMs?: number } }) =>
          trial.stimulus.phase === "delayed" &&
          trial.stimulus.delayDurationMs === 1000,
      ),
    ).toBe(true);
    expect(persisted.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "learning_memory",
          metricName: "immediate_accuracy",
          rawValue: 1,
        }),
        expect.objectContaining({
          domain: "learning_memory",
          metricName: "delayed_accuracy",
          rawValue: 1,
        }),
        expect.objectContaining({
          domain: "learning_memory",
          metricName: "recognition_accuracy",
          rawValue: 1,
        }),
      ]),
    );

    await page.screenshot({
      path: testInfo.outputPath("pair-learning-interactive.png"),
      fullPage: true,
    });
  });
});

async function chooseCurrentTarget(
  runner: Locator,
  isMobile: boolean,
  labelPrefix: "Choose" | "Recognize",
) {
  const target = await runner
    .getByTestId("pair-learning-current-target")
    .getAttribute("data-target");
  expect(target).not.toBeNull();
  const button = runner.getByRole("button", {
    name: `${labelPrefix} ${target}`,
  });
  if (isMobile) {
    await button.tap();
  } else {
    await button.click();
  }
}
