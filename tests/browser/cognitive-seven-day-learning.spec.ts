import { expect, test, type Locator } from "@playwright/test";

test.describe("Seven-Day Learning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
  });

  test("captures repeated-pack days, a missed day, and monthly summary", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile-chromium";
    await page
      .getByRole("button", { name: "Start Seven-Day Learning" })
      .click();
    const runner = page.getByRole("region", {
      name: "Seven-Day Learning runner",
    });

    for (let day = 1; day <= 7; day += 1) {
      await expect(runner.getByText(`Learning day ${day} of 7`)).toBeVisible();
      if (day === 3) {
        await runner.getByRole("button", { name: "Mark day missed" }).click();
      } else {
        await chooseCurrentTarget(runner, isMobile);
      }
    }

    await expect(
      runner.getByText("Seven-Day Learning saved locally."),
    ).toBeVisible();
    await expect(
      runner.getByText("Monthly summary: 6 completed days, 1 missed."),
    ).toBeVisible();

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
      const learningRun = taskRuns.find(
        (run: { taskId: string }) => run.taskId === "seven_day_learning_week",
      );
      if (!learningRun) {
        throw new Error("Seven-Day Learning task run was not saved.");
      }
      const learningSession = sessions.find(
        (session: { sessionId: string }) =>
          session.sessionId === learningRun.sessionId,
      );
      if (!learningSession) {
        throw new Error("Seven-Day Learning session was not saved.");
      }
      const trials = await local.listTrialEventsForTaskRun(
        learningRun.taskRunId,
      );
      const scores = await local.listScores({
        taskRunId: learningRun.taskRunId,
      });
      return { learningRun, learningSession, scores, trials };
    });

    expect(persisted.learningRun).toMatchObject({
      taskVersion: "1.0.0",
      stimulusSeed: "interactive-seven-day-learning-v1",
    });
    expect(persisted.trials).toHaveLength(7);
    expect(persisted.learningSession.contextSnapshot).toMatchObject({
      interactive: true,
      taskId: "seven_day_learning_week",
    });
    expect(persisted.learningSession.contextSnapshot.demo).toBeUndefined();
    const packIds = [
      ...new Set(
        persisted.trials.map(
          (trial: { stimulus: { packId?: string } }) => trial.stimulus.packId,
        ),
      ),
    ];
    expect(packIds).toHaveLength(1);
    expect(packIds[0]).toEqual(expect.stringMatching(/^pair_pack_/));
    expect(
      persisted.trials.some(
        (trial: {
          actualResponse: string | null;
          correct: boolean | null;
          eventFlags: string[];
          stimulus: { day?: number; missed?: boolean };
        }) =>
          trial.stimulus.day === 3 &&
          trial.stimulus.missed === true &&
          trial.actualResponse === null &&
          trial.correct === null &&
          trial.eventFlags.includes("missed_day"),
      ),
    ).toBe(true);
    expect(persisted.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "learning_memory",
          metricName: "completed_days",
          rawValue: 6,
        }),
        expect.objectContaining({
          domain: "learning_memory",
          metricName: "missed_days",
          rawValue: 1,
        }),
        expect.objectContaining({
          domain: "learning_memory",
          metricName: "retention",
          rawValue: 1,
        }),
      ]),
    );

    await page.screenshot({
      path: testInfo.outputPath("seven-day-learning-interactive.png"),
      fullPage: true,
    });
  });
});

async function chooseCurrentTarget(runner: Locator, isMobile: boolean) {
  const target = await runner
    .getByTestId("seven-day-current-target")
    .getAttribute("data-target");
  expect(target).not.toBeNull();
  const button = runner.getByRole("button", { name: `Recall ${target}` });
  if (isMobile) {
    await button.tap();
  } else {
    await button.click();
  }
}
