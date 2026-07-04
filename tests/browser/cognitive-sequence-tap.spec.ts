import { expect, test, type Locator } from "@playwright/test";

test.describe("Sequence Tap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
  });

  test("captures keyboard, touch, and missed sequence responses", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name === "mobile-chromium";
    await page.getByRole("button", { name: "Start Sequence Tap" }).click();
    const runner = page.getByRole("region", { name: "Sequence Tap runner" });
    await expect(runner.getByText("Sequence Tap trial 1 of 3")).toBeVisible();

    const firstSequence = await readSequence(runner);
    for (const tile of firstSequence) {
      await page.keyboard.press(String(tile + 1));
    }

    await expect(runner.getByText("Sequence Tap trial 2 of 3")).toBeVisible();
    const secondSequence = await readSequence(runner);
    for (const tile of secondSequence) {
      const tileButton = runner.getByRole("button", {
        name: `Tile ${tile + 1}`,
      });
      if (isMobile) {
        await tileButton.tap();
      } else {
        await tileButton.click();
      }
    }

    await expect(runner.getByText("Sequence Tap trial 3 of 3")).toBeVisible();
    await runner.getByRole("button", { name: "Mark missed" }).click();

    await expect(page.getByText("Sequence Tap saved locally.")).toBeVisible();
    await expect(runner.getByText("Sequence Tap span:")).toBeVisible();

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
      const sequenceRun = taskRuns.find(
        (run: { taskId: string }) => run.taskId === "sequence_tap",
      );
      if (!sequenceRun) throw new Error("Sequence Tap task run was not saved.");
      const sequenceSession = sessions.find(
        (session: { sessionId: string }) =>
          session.sessionId === sequenceRun.sessionId,
      );
      if (!sequenceSession) {
        throw new Error("Sequence Tap session was not saved.");
      }
      const trials = await local.listTrialEventsForTaskRun(
        sequenceRun.taskRunId,
      );
      const scores = await local.listScores({
        taskRunId: sequenceRun.taskRunId,
      });
      return { scores, sequenceRun, sequenceSession, trials };
    });

    expect(persisted.sequenceRun).toMatchObject({
      taskVersion: "1.0.0",
      stimulusSeed: "interactive-sequence-tap-v1",
    });
    expect(persisted.trials).toHaveLength(3);
    expect(persisted.sequenceSession.contextSnapshot).toMatchObject({
      interactive: true,
      taskId: "sequence_tap",
    });
    expect(persisted.sequenceSession.contextSnapshot.demo).toBeUndefined();
    expect(persisted.trials[0].actualResponse).toEqual(firstSequence);
    expect(persisted.trials[0].eventFlags).toContain("input_keyboard");
    expect(persisted.trials[1].actualResponse).toEqual(secondSequence);
    expect(persisted.trials[1].eventFlags).toContain(
      isMobile ? "input_touch" : "input_pointer",
    );
    expect(persisted.trials[2].actualResponse).toBeNull();
    expect(persisted.trials[2].eventFlags).toContain("missed_response");
    expect(persisted.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "working_memory",
          metricName: "span",
          rawValue: 3,
        }),
        expect.objectContaining({
          domain: "working_memory",
          metricName: "missed_count",
          rawValue: 1,
        }),
      ]),
    );

    await page.screenshot({
      path: testInfo.outputPath("sequence-tap-interactive.png"),
      fullPage: true,
    });
  });
});

async function readSequence(runner: Locator) {
  const value = await runner
    .getByTestId("sequence-tap-current-sequence")
    .getAttribute("data-sequence");
  expect(value).not.toBeNull();
  return value!.split(",").map((tile) => Number(tile));
}
