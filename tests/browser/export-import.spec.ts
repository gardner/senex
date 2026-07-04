import { promises as fs } from "node:fs";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type BrowserSession = { sessionId: string };

test.describe("JSON export and import", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.deleteSenexLocalDatabase();
    });
  });

  test("generates local history JSON without uploading it", async ({
    page,
  }) => {
    await seedLocalHistory(page);

    const outboundRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("blob:") && !url.includes("localhost")) {
        outboundRequests.push(url);
      }
    });

    const parsed = await page.evaluate(async () => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      return local.createLocalExportEnvelope();
    });
    expect(parsed.format).toBe("senex.local-backup");
    expect(parsed.data.profiles).toHaveLength(1);
    expect(parsed.data.sessions).toHaveLength(1);
    expect(parsed.data.taskRuns).toHaveLength(1);
    expect(parsed.data.trialEvents).toHaveLength(1);
    expect(parsed.data.scores).toHaveLength(1);
    expect(parsed.data.stimulusReferences[0].stimulusPackId).toBe("demo_pack");
    expect(outboundRequests).toEqual([]);
  });

  test("previews valid and invalid imports without writing local data", async ({
    page,
  }, testInfo) => {
    const backup = await buildFixtureBackup(page, "session_import");
    const backupPath = testInfo.outputPath("senex-backup.json");
    await fs.writeFile(backupPath, JSON.stringify(backup), "utf8");

    const corruptError = await page.evaluate(() => {
      const localPath = "/lib/local/index.ts";
      return import(/* @vite-ignore */ localPath).then((local) => {
        try {
          local.parseLocalExportJson("{not-json");
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
        return "";
      });
    });
    expect(corruptError).toContain("valid JSON");

    await page
      .getByLabel("Backup JSON")
      .fill(await fs.readFile(backupPath, "utf8"));
    await page.getByRole("button", { name: "Preview pasted backup" }).click();
    await expect(page.getByText("Import preview")).toBeVisible();
    await expect(page.getByText("Sessions: 1")).toBeVisible();
    await expect(
      page.getByText("This preview has not changed local data."),
    ).toBeVisible();

    const summary = await readSummary(page);
    expect(summary.hasLocalHistory).toBe(false);

    await page.screenshot({
      path: testInfo.outputPath("export-import-preview.png"),
      fullPage: true,
    });
  });

  test("merges, replaces, and rolls back failed imports", async ({ page }) => {
    const backup = await buildFixtureBackup(page, "session_import");
    await restoreBackup(page, backup, "merge");
    await restoreBackup(page, backup, "merge");

    await expectLocalSessions(page, ["session_import"]);
    await expectImportAuditCount(page, 2);

    await seedLocalHistory(page);
    await restoreBackup(page, backup, "replace");
    await expectLocalSessions(page, ["session_import"]);

    const failed = await page.evaluate(async (envelope) => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      try {
        await local.restoreLocalExportEnvelope(envelope, {
          mode: "merge",
          simulateFailureForTests: true,
        });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      return "";
    }, backup);

    expect(failed).toContain("Simulated import failure");
    await expectLocalSessions(page, ["session_import"]);
  });
});

async function seedLocalHistory(page: Page) {
  await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    const session = await local.startLocalSession({
      cadence: "daily",
      contextSnapshot: { sleepHours: 7 },
      startedAt: "2026-07-04T00:00:00.000Z",
    });
    const taskRun = await local.saveTaskRun({
      taskRunId: "task_run_demo",
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
        trialEventId: "trial_demo",
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
      scoreId: "score_demo",
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

async function buildFixtureBackup(page: Page, sessionId: string) {
  return page.evaluate(async (nextSessionId) => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    await local.deleteSenexLocalDatabase();
    const profile = await local.getOrCreateLocalProfile();
    await local.saveLocalSessionForTests({
      sessionId: nextSessionId,
      profileId: profile.profileId,
      startedAt: "2026-07-03T00:00:00.000Z",
      completedAt: null,
      cadence: "weekly",
      contextSnapshot: {},
      qualityFlags: [],
    });
    const envelope = await local.createLocalExportEnvelope();
    await local.deleteSenexLocalDatabase();
    return envelope;
  }, sessionId);
}

async function restoreBackup(
  page: Page,
  backup: unknown,
  mode: "merge" | "replace",
) {
  await page.evaluate(
    async ({ envelope, importMode }) => {
      const localPath = "/lib/local/index.ts";
      const local = await import(/* @vite-ignore */ localPath);
      await local.restoreLocalExportEnvelope(envelope, { mode: importMode });
    },
    { envelope: backup, importMode: mode },
  );
}

async function readSummary(page: Page) {
  return page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    return local.readLocalStorageSummary();
  });
}

async function expectLocalSessions(page: Page, sessionIds: string[]) {
  const actual = await page.evaluate<BrowserSession[]>(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    return local.listAllLocalSessionsForTests();
  });
  expect(actual.map((session) => session.sessionId).sort()).toEqual(
    sessionIds.toSorted(),
  );
}

async function expectImportAuditCount(page: Page, count: number) {
  const audits = await page.evaluate(async () => {
    const localPath = "/lib/local/index.ts";
    const local = await import(/* @vite-ignore */ localPath);
    return local.listImportAudits();
  });
  expect(audits).toHaveLength(count);
}
