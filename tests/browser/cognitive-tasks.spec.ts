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

  test("captures interactive symbol match responses by keyboard and pointer", async ({
    page,
  }, testInfo) => {
    await page.getByRole("button", { name: "Start Symbol Match" }).click();
    const runner = page.getByRole("region", { name: "Symbol Match runner" });
    await expect(runner.getByText("Symbol Match trial 1 of 6")).toBeVisible();

    const firstChoice = await runner
      .getByTestId("symbol-match-choice-0")
      .getAttribute("data-symbol-value");
    expect(firstChoice).not.toBeNull();
    await page.keyboard.press("1");

    for (let trialIndex = 2; trialIndex <= 6; trialIndex += 1) {
      await expect(
        runner.getByText(`Symbol Match trial ${trialIndex} of 6`),
      ).toBeVisible();
      const target = await runner
        .getByTestId("symbol-match-target")
        .textContent();
      await runner.getByRole("button", { name: `Choose ${target}` }).click();
    }

    await expect(page.getByText("Symbol Match saved locally.")).toBeVisible();
    await expect(runner.getByText("Symbol Match correct count:")).toBeVisible();

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
      const symbolSession = sessions.find(
        (session: { sessionId: string }) =>
          session.sessionId === symbolRun.sessionId,
      );
      if (!symbolSession) {
        throw new Error("Symbol Match session was not saved.");
      }
      const trials = await local.listTrialEventsForTaskRun(symbolRun.taskRunId);
      const scores = await local.listScores({
        taskRunId: symbolRun.taskRunId,
      });
      return { symbolRun, symbolSession, trials, scores };
    });

    expect(persisted.symbolRun).toMatchObject({
      taskVersion: "1.0.0",
      stimulusSeed: "interactive-symbol-match-v1",
    });
    expect(persisted.trials).toHaveLength(6);
    expect(persisted.symbolSession.contextSnapshot).toMatchObject({
      interactive: true,
      taskId: "symbol_match",
    });
    expect(persisted.symbolSession.contextSnapshot.demo).toBeUndefined();
    expect(persisted.trials[0].actualResponse).toBe(firstChoice);
    expect(persisted.trials[0].eventFlags).toContain("input_keyboard");
    expect(persisted.scores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "processing_speed",
          metricName: "valid_trial_count",
          rawValue: 6,
        }),
      ]),
    );

    await page.screenshot({
      path: testInfo.outputPath("symbol-match-interactive.png"),
      fullPage: true,
    });
  });
});
